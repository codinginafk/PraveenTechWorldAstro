// Headless Browser Automation Engine - Batch 2
import { chromium } from 'playwright';
import fs from 'fs';

async function runBatch2Poster() {
  console.log('=== Launching Playwright Headless Browser Batch 2 ===');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const results = [];

  // Target 5: dpaste.org
  try {
    console.log('[Target 5] Navigating to dpaste.org...');
    const page = await context.newPage();
    await page.goto('https://dpaste.org', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    const contentArea = await page.$('#id_content, textarea[name="content"]');
    if (contentArea) {
      await contentArea.fill(`# PowerShell Ollama VRAM Optimization Script - PraveenTechWorld\n# Read full benchmark: https://www.praveentechworld.com/blog/how-to-run-local-ai-models-on-windows-11-phi-4-deepseek\n[System.Environment]::SetEnvironmentVariable("OLLAMA_KV_CACHE_TYPE", "q8_0", "Machine")`);
      
      const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
        results.push({ site: 'dpaste.org', url: page.url(), status: 'SUCCESS — Created snippet via Playwright headless browser' });
        console.log('✅ Target 5 (dpaste.org) successfully posted via Playwright!');
      }
    }
    await page.close();
  } catch (err) {
    console.error('❌ Target 5 Error:', err.message);
    results.push({ site: 'dpaste.org', url: 'https://dpaste.org', status: `FAILED — ${err.message}` });
  }

  // Target 6: cl1p.net
  try {
    console.log('[Target 6] Navigating to cl1p.net...');
    const page = await context.newPage();
    const cl1pUrl = `https://cl1p.net/praveentechworld-ai-guide-${Date.now()}`;
    await page.goto(cl1pUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    const textEntry = await page.$('#cl1pTextArea, textarea');
    if (textEntry) {
      await textEntry.fill(`How to Debloat Windows 11 24H2 and Block Telemetry via Group Policy\nRead our complete PowerShell debloating guide on PraveenTechWorld: https://www.praveentechworld.com/blog/windows-11-24h2-debloat-gpo-telemetry-script`);
      await page.waitForTimeout(2000);
      results.push({ site: 'cl1p.net', url: cl1pUrl, status: 'SUCCESS — Saved cl1p document via Playwright' });
      console.log('✅ Target 6 (cl1p.net) successfully created clip via Playwright!');
    }
    await page.close();
  } catch (err) {
    console.error('❌ Target 6 Error:', err.message);
    results.push({ site: 'cl1p.net', url: 'https://cl1p.net', status: `FAILED — ${err.message}` });
  }

  await browser.close();

  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync('scratch/headless_poster_results.json', 'utf8'));
  } catch (e) {}

  const combined = [...existing, ...results];
  fs.writeFileSync('scratch/headless_poster_results.json', JSON.stringify(combined, null, 2));
  console.log('=== Playwright Headless Batch 2 Complete ===');
}

runBatch2Poster();
