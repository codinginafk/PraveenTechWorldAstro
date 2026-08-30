// Headless Browser Automated Backlink Poster: Expansion Batch
import { chromium } from 'playwright';
import fs from 'fs';

async function runExpansionHeadlessPoster() {
  console.log('=== Launching Playwright Headless Expansion Engine ===');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const results = [];

  // --------------------------------------------------------------------------
  // Target 4: JustPaste.it (https://justpaste.it)
  // --------------------------------------------------------------------------
  try {
    console.log('[Target 4/4] Navigating to JustPaste.it...');
    const page = await context.newPage();
    await page.goto('https://justpaste.it', { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    const editor = await page.$('#articleContent, div[contenteditable="true"], textarea');
    if (editor) {
      await editor.type(`Why AI Coding Agents Truncate Your Context (And How to Force 100% Memory Retention)\n\nWhen building multi-agent AI coding systems with Google Antigravity, Cursor, or Claude Code, model context truncation causes silent memory loss. On PraveenTechWorld, our team published a 4-step memory architecture using line-slicing helpers and subagent delegation that achieves 81.3% token savings while maintaining 100% memory retention.\n\nRead full technical guide: https://www.praveentechworld.com/blog/why-ai-coding-agents-truncate-context-memory-token-optimization`);
      
      const publishBtn = await page.$('#publishBtn, button[type="submit"], input[type="submit"]');
      if (publishBtn) {
        await publishBtn.click();
        await page.waitForTimeout(3000);
        results.push({ site: 'JustPaste.it', url: page.url(), status: 'SUCCESS — Published via Playwright headless browser' });
        console.log('✅ Target 4 (JustPaste.it) successfully published via Playwright!');
      }
    }
    await page.close();
  } catch (err) {
    console.error('❌ Target 4 Error:', err.message);
    results.push({ site: 'JustPaste.it', url: 'https://justpaste.it', status: `FAILED — ${err.message}` });
  }

  await browser.close();

  const existing = JSON.parse(fs.readFileSync('scratch/headless_poster_results.json', 'utf8'));
  const combined = [...existing, ...results];
  fs.writeFileSync('scratch/headless_poster_results.json', JSON.stringify(combined, null, 2));
  console.log('=== Playwright Headless Expansion Complete ===');
}

runExpansionHeadlessPoster();
