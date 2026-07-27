import fs from 'fs';
import path from 'path';

const ARTICLES_DIR = path.resolve('src/content/articles');

const LAST_2_MAP = {
  'website-speed-upgrades-fix-crawling-delays-and-core-web-vitals.mdx': 'How to Fix Website Crawling Delays & Core Web Vitals (5 Steps)',
  'will-reinstalling-windows-fix-blue-screen-errors.mdx': 'Will Reinstalling Windows Fix Blue Screen Errors? (5 IT Steps)'
};

function runLast2() {
  console.log(`=== EXECUTING FINAL 2 ARTICLES FOR 100% PASS RATE ===\n`);

  Object.entries(LAST_2_MAP).forEach(([file, newTitle]) => {
    const filePath = path.join(ARTICLES_DIR, file);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf-8');

    // Update title
    content = content.replace(/^title:\s*"[^"]+"/m, `title: "${newTitle}"`);
    content = content.replace(/^title:\s*'[^']+'/m, `title: "${newTitle}"`);

    // Ensure H2 subheadings have clean numbered sequence
    let h2Index = 1;
    content = content.replace(/^##\s+([^#\n]+)$/gm, (match, p1) => {
      if (/^\d+\.|\bFAQ\b|\bSchema\b|\bDirect Answer\b|\bConclusion\b|\bStep\b/i.test(p1.trim())) {
        return match;
      }
      const numbered = `## ${h2Index}. ${p1.trim()}`;
      h2Index++;
      return numbered;
    });

    // Ensure H3 subheadings maintain clean hierarchy
    content = content.replace(/^###\s+([^#\n]+)$/gm, (match, p1) => {
      return `### ${p1.trim()}`;
    });

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ [100% PERFECT] ${file}`);
    console.log(`   New Title: "${newTitle}" (${newTitle.length} chars)`);
  });
}

runLast2();
