// Headless Browser Automation Engine - Batch 3
import { chromium } from 'playwright';
import fs from 'fs';

async function runBatch3Poster() {
  console.log('=== Launching Playwright Headless Browser Batch 3 ===');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const results = [];

  // Target 7: dpaste.com
  try {
    console.log('[Target 7] Navigating to dpaste.com...');
    const page = await context.newPage();
    await page.goto('https://dpaste.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    const contentArea = await page.$('#id_content, textarea[name="content"]');
    if (contentArea) {
      await contentArea.fill(`How to Debloat Windows 11 24H2 and Block Telemetry via Group Policy\nRead our complete PowerShell debloating guide on PraveenTechWorld: https://www.praveentechworld.com/blog/windows-11-24h2-debloat-gpo-telemetry-script`);
      
      const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
        results.push({ site: 'dpaste.com', url: page.url(), status: 'SUCCESS — Created paste via Playwright headless browser' });
        console.log('✅ Target 7 (dpaste.com) successfully posted via Playwright!');
      }
    }
    await page.close();
  } catch (err) {
    console.error('❌ Target 7 Error:', err.message);
    results.push({ site: 'dpaste.com', url: 'https://dpaste.com', status: `FAILED — ${err.message}` });
  }

  await browser.close();

  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync('scratch/headless_poster_results.json', 'utf8'));
  } catch (e) {}

  const combined = [...existing, ...results];
  fs.writeFileSync('scratch/headless_poster_results.json', JSON.stringify(combined, null, 2));
  console.log('=== Playwright Headless Batch 3 Complete ===');
}

runBatch3Poster();
