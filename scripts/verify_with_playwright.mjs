import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs/promises';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'scratch', 'screenshots');
await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

async function verifyAll() {
  console.log('========================================================================');
  console.log('🚀 PRAVEENTECHWORLD PLAYWRIGHT HEADLESS VERIFICATION RUN');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 PlaywrightTester/1.0'
  });

  const page = await context.newPage();

  const testResults = [];

  // 1. Verify Local Control System Dashboard
  try {
    console.log('• [1/4] Verifying Local Control System Dashboard (http://127.0.0.1:8787)...');
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const resp = await page.goto('http://127.0.0.1:8787', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const title = await page.title();
    const status = resp ? resp.status() : 0;

    // Take screenshot
    const dashShot = path.join(SCREENSHOT_DIR, '01_control_dashboard.png');
    await page.screenshot({ path: dashShot, fullPage: false });

    console.log(`  ✓ HTTP Status: ${status}`);
    console.log(`  ✓ Title: "${title}"`);
    console.log(`  ✓ Screenshot saved: ${dashShot}`);
    testResults.push({ target: 'Control Dashboard', ok: status === 200, detail: title });
  } catch (err) {
    console.error(`  ❌ Control Dashboard verification failed: ${err.message}`);
    testResults.push({ target: 'Control Dashboard', ok: false, detail: err.message });
  }

  // 2. Verify Live Main Site & CDN Status
  try {
    console.log('\n• [2/4] Verifying Live Production Homepage (https://www.praveentechworld.com)...');
    const resp = await page.goto('https://www.praveentechworld.com', { waitUntil: 'networkidle', timeout: 15000 });
    const title = await page.title();
    const status = resp ? resp.status() : 0;

    const homeShot = path.join(SCREENSHOT_DIR, '02_live_homepage.png');
    await page.screenshot({ path: homeShot, fullPage: false });

    console.log(`  ✓ HTTP Status: ${status}`);
    console.log(`  ✓ Title: "${title}"`);
    console.log(`  ✓ Screenshot saved: ${homeShot}`);
    testResults.push({ target: 'Live Homepage', ok: status === 200, detail: title });
  } catch (err) {
    console.error(`  ❌ Live Homepage verification failed: ${err.message}`);
    testResults.push({ target: 'Live Homepage', ok: false, detail: err.message });
  }

  // 3. Verify Live Interactive Tools Hub & Windows Error Decryptor
  try {
    console.log('\n• [3/4] Verifying Tools Hub & Windows Error Decryptor (https://www.praveentechworld.com/tools)...');
    const resp = await page.goto('https://www.praveentechworld.com/tools', { waitUntil: 'networkidle', timeout: 15000 });
    const status = resp ? resp.status() : 0;

    // Check presence of both tools
    const vramPresent = await page.locator('text=Local AI VRAM').count() > 0;
    const errorToolPresent = await page.locator('text=Windows Error Code Decryptor').count() > 0;

    const toolsShot = path.join(SCREENSHOT_DIR, '03_tools_hub.png');
    await page.screenshot({ path: toolsShot, fullPage: false });

    console.log(`  ✓ Tools Hub HTTP Status: ${status}`);
    console.log(`  ✓ VRAM Calculator Card Present: ${vramPresent}`);
    console.log(`  ✓ Windows Error Decryptor Card Present: ${errorToolPresent}`);
    console.log(`  ✓ Screenshot saved: ${toolsShot}`);

    // Now navigate to the tool itself and test interaction!
    console.log('  Testing Windows Error Decryptor interaction at /tools/windows-error-fixer...');
    const toolResp = await page.goto('https://www.praveentechworld.com/tools/windows-error-fixer', { waitUntil: 'networkidle', timeout: 15000 });
    const toolTitle = await page.title();

    // Click preset button 0x8024200d
    await page.click('button[data-code="0x8024200d"]');
    await page.waitForTimeout(500);

    // Verify card rendered
    const cardRendered = await page.locator('text=WU_E_UH_NEEDUNPACKING').isVisible();
    const psScriptVisible = await page.locator('text=Stop-Service -Name wuauserv').isVisible();

    // Test copy button
    const copyBtn = page.locator('button.copy-btn').first();
    await copyBtn.click();
    await page.waitForTimeout(300);
    const copiedText = await copyBtn.innerText();

    const toolInteractiveShot = path.join(SCREENSHOT_DIR, '04_tool_interactive.png');
    await page.screenshot({ path: toolInteractiveShot, fullPage: false });

    console.log(`  ✓ Tool Title: "${toolTitle}"`);
    console.log(`  ✓ Card Rendered on Click: ${cardRendered}`);
    console.log(`  ✓ PowerShell Script Visible: ${psScriptVisible}`);
    console.log(`  ✓ Copy Button State: "${copiedText}"`);
    console.log(`  ✓ Screenshot saved: ${toolInteractiveShot}`);

    testResults.push({
      target: 'Windows Error Decryptor Tool',
      ok: cardRendered && psScriptVisible,
      detail: `Interactive click test passed! (${copiedText})`
    });
  } catch (err) {
    console.error(`  ❌ Tools Hub / Error Decryptor verification failed: ${err.message}`);
    testResults.push({ target: 'Windows Error Decryptor Tool', ok: false, detail: err.message });
  }

  // 4. Verify Cycle 33 Elevated Article
  try {
    console.log('\n• [4/4] Verifying Cycle 33 Article (https://www.praveentechworld.com/blog/how-deepseek-orchestration-logs-improve-cloud-operations-2026)...');
    const resp = await page.goto(
      'https://www.praveentechworld.com/blog/how-deepseek-orchestration-logs-improve-cloud-operations-2026',
      { waitUntil: 'networkidle', timeout: 15000 }
    );
    const status = resp ? resp.status() : 0;
    const h1 = await page.locator('h1').innerText();

    // Check direct answer blockquote
    const directAnswer = await page.locator('blockquote').first().innerText();
    // Check failure modes table
    const tableHeaders = await page.locator('table th').allInnerTexts();
    // Check python script
    const pythonCode = await page.locator('pre code').first().innerText();

    const articleShot = path.join(SCREENSHOT_DIR, '05_article_deepseek_orchestration.png');
    await page.screenshot({ path: articleShot, fullPage: false });

    console.log(`  ✓ HTTP Status: ${status}`);
    console.log(`  ✓ H1: "${h1.trim()}"`);
    console.log(`  ✓ Direct Answer Present: ${directAnswer.includes('Quick answer')}`);
    console.log(`  ✓ Table Headers: [${tableHeaders.join(', ')}]`);
    console.log(`  ✓ Code Block Present: ${pythonCode.length > 0}`);
    console.log(`  ✓ Screenshot saved: ${articleShot}`);

    testResults.push({
      target: 'Cycle 33 Elevated Article',
      ok: status === 200 && directAnswer.includes('Quick answer'),
      detail: `H1: "${h1.trim()}", Table with ${tableHeaders.length} cols`
    });
  } catch (err) {
    console.error(`  ❌ Article verification failed: ${err.message}`);
    testResults.push({ target: 'Cycle 33 Elevated Article', ok: false, detail: err.message });
  }

  await browser.close();

  console.log('\n========================================================================');
  console.log('📊 PLAYWRIGHT VERIFICATION SUMMARY');
  console.log('========================================================================');
  for (const r of testResults) {
    console.log(`• ${r.target.padEnd(32)}: [${r.ok ? 'PASS ✅' : 'FAIL ❌'}] - ${r.detail}`);
  }
  console.log('========================================================================\n');
}

verifyAll().catch(err => {
  console.error('Fatal Playwright Error:', err);
  process.exit(1);
});
