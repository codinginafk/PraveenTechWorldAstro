import fs from 'fs';
import path from 'path';

const latest15Files = [
  'bitlocker-recovery-screen-loop-after-windows-update.mdx',
  'best-business-password-managers-enterprise-guide.mdx',
  'gemini-3-6-flash-honest-review-production-use.mdx',
  'gemini-3-6-flash-vs-3-5-flash-complete-guide.mdx',
  'best-free-ai-avatar-generators-in-2026.mdx',
  'best-free-ai-logo-generators-in-2026.mdx',
  'how-to-run-deepseek-r1-locally-on-8gb-vram.mdx',
  'best-free-ai-image-generators-better-than-chatgpt-and-gemini.mdx',
  'best-free-ai-video-generators-sora-vs-ltx-desktop.mdx',
  'how-to-set-up-fooocus-locally-gpu-guide.mdx',
  'docker-volume-permission-denied-fixes.mdx',
  'how-to-add-google-custom-search-to-website.mdx',
  'why-our-dev-team-quit-docker-desktop.mdx',
  'debull-tooling-abuses-microsoft-device-code-flow-to-target-m365-accounts.mdx',
  'how-to-tell-if-your-ram-is-bad-a-step-by-step-pc-diagnostics-guide.mdx'
];

const dir = 'src/content/articles';

let filesModified = 0;

latest15Files.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Preserve frontmatter
  const frontmatterMatch = content.match(/^---[\s\S]*?---/);
  const frontmatter = frontmatterMatch ? frontmatterMatch[0] : '';
  let body = content.replace(/^---[\s\S]*?---/, '');

  // 1. Replace Em-dashes (—) in body with commas, colons, or parentheses based on context
  // Context: "Word — explanation" -> "Word: explanation" or "Word, explanation"
  body = body.replace(/(\w+)\s*—\s*([a-z])/g, '$1, $2');
  body = body.replace(/(\w+)\s*—\s*([A-Z])/g, '$1: $2');
  body = body.replace(/—/g, ' - ');

  // 2. Replace En-dashes (–) with hyphens (-) or commas
  body = body.replace(/(\d+)\s*–\s*(\d+)/g, '$1-$2');
  body = body.replace(/–/g, '-');

  // 3. Curly quotes to straight quotes in body
  body = body.replace(/[“”]/g, '"');
  body = body.replace(/[‘’]/g, "'");

  // 4. AI Cliché replacements
  body = body.replace(/\bAdditionally,\b/g, 'Also,');
  body = body.replace(/\bIn order to\b/g, 'To');
  body = body.replace(/\bin order to\b/g, 'to');
  body = body.replace(/\bserves as a testament to\b/g, 'is proof of');
  body = body.replace(/\bserves as\b/g, 'is');
  body = body.replace(/\bstands as\b/g, 'is');
  body = body.replace(/\bevolving landscape\b/g, 'tech ecosystem');
  body = body.replace(/\bdigital landscape\b/g, 'tech landscape');

  content = frontmatter + body;

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    filesModified++;
    console.log(`Humanized & cleaned dashes/AI words in: ${file}`);
  }
});

console.log(`\nSuccessfully humanized ${filesModified} of 15 articles!`);
