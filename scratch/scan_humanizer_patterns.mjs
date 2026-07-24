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

let totalEmDashes = 0;
let totalEnDashes = 0;
let totalAiWords = 0;

const aiWordsRegex = /\b(testament|underscores|pivotal|landscape|delve|intricate|intricacies|tapestry|fostering|garner|exemplifies|grounding|moreover|furthermore|additionally|serves as|stands as)\b/gi;

latest15Files.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Exclude frontmatter
  const body = content.replace(/^---[\s\S]*?---/, '');
  
  const emDashes = (body.match(/—/g) || []).length;
  const enDashes = (body.match(/–/g) || []).length;
  const aiWordMatches = body.match(aiWordsRegex) || [];
  
  totalEmDashes += emDashes;
  totalEnDashes += enDashes;
  totalAiWords += aiWordMatches.length;
  
  console.log(`[${file}]`);
  console.log(`  - Em-dashes (—): ${emDashes}`);
  console.log(`  - En-dashes (–): ${enDashes}`);
  console.log(`  - AI Words: ${aiWordMatches.length} (${[...new Set(aiWordMatches)].join(', ')})`);
});

console.log('\n=== TOTALS FOR LATEST 15 ARTICLES ===');
console.log(`Total Em-dashes: ${totalEmDashes}`);
console.log(`Total En-dashes: ${totalEnDashes}`);
console.log(`Total AI Cliché Words: ${totalAiWords}`);
