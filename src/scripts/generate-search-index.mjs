import fs from 'fs';
import path from 'path';

const articlesDir = path.resolve('src/content/articles');
const outputPath = path.resolve('public/search-index.json');

const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
const searchIndex = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(articlesDir, file), 'utf8');
  
  // Skip drafts
  const draftMatch = content.match(/draft:\s*(true|false)/i);
  if (draftMatch && draftMatch[1].toLowerCase() === 'true') continue;

  const slug = file.replace(/\.(mdx|md)$/, '');
  
  // Extract frontmatter
  const titleMatch = content.match(/title:\s*["']?(.*?)["']?\r?\n/);
  const descMatch = content.match(/description:\s*["']?(.*?)["']?\r?\n/);
  const catMatch = content.match(/category:\s*["']?(.*?)["']?\r?\n/);
  const dateMatch = content.match(/publishDate:\s*["']?(.*?)["']?\r?\n/);
  const imageMatch = content.match(/coverImage:\s*["']?(.*?)["']?\r?\n/);

  // Extract tags
  const tags = [];
  const tagsBlock = content.match(/tags:\s*\n((?:\s*-\s*.*?\n)+)/);
  if (tagsBlock) {
    const lines = tagsBlock[1].split('\n');
    for (const line of lines) {
      const tagMatch = line.match(/-\s*["']?(.*?)["']?\s*$/);
      if (tagMatch && tagMatch[1]) tags.push(tagMatch[1].trim());
    }
  }

  // Extract plain text snippet from first paragraphs
  const bodyText = content.replace(/---[\s\S]*?---/, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[#*`_~\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const excerpt = bodyText.slice(0, 200);

  searchIndex.push({
    slug,
    url: `/blog/${slug}`,
    title: titleMatch ? titleMatch[1].trim() : slug,
    description: descMatch ? descMatch[1].trim() : excerpt,
    category: catMatch ? catMatch[1].trim() : 'tech',
    tags,
    publishDate: dateMatch ? dateMatch[1].trim() : '',
    coverImage: imageMatch ? imageMatch[1].trim() : '',
    excerpt
  });
}

// Add interactive tools to search index
searchIndex.push({
  slug: 'vram-calculator',
  url: '/tools/vram-calculator',
  title: 'Local AI VRAM & Model Quantization Calculator',
  description: 'Calculate GPU VRAM requirements for local LLMs (DeepSeek R1, Llama 3.3, Qwen, Mistral) across FP16, Q8, Q4_K_M quantizations and context window sizes.',
  category: 'tools',
  tags: ['ai', 'vram', 'quantization', 'gpu', 'deepseek', 'ollama', 'calculator'],
  publishDate: '2026-08-30',
  coverImage: '',
  excerpt: 'Interactive tool for sizing GPU VRAM, token context overhead, and RAM offloading.'
});

fs.writeFileSync(outputPath, JSON.stringify(searchIndex, null, 2), 'utf8');
console.log(`[Search Index] Generated ${searchIndex.length} searchable items into ${outputPath}`);
