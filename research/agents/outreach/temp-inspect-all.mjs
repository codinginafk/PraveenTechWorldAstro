import { chromium } from "playwright";
import fs from "fs";
const browser = await chromium.launch({ headless: true });

async function inspect(url, label) {
  console.log(`\n=== ${label} ===`);
  const page = await browser.newPage();
  try {
    await page.goto(url, { timeout: 15000 });
    await page.waitForTimeout(3000);
    console.log("Title:", await page.title());
    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll("form"));
      return forms.map(f => ({
        id: f.id,
        action: f.action,
        method: f.method,
        inputs: Array.from(f.querySelectorAll("input, textarea, select")).map(el => ({
          name: el.name || el.id || "(unnamed)",
          type: el.type || "text",
          placeholder: el.placeholder || "",
          visible: el.offsetParent !== null,
        })),
      }));
    });
    console.log(JSON.stringify(info, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
  }
  await page.close();
}

await inspect("https://www.techuniverses.com/write-for-us-technology/", "Tech Universes");
await inspect("https://www.sentisight.ai/write-for-us/", "SentiSight AI");
await inspect("https://www.setproduct.com/blog/submit-a-guest-post", "Setproduct");
await inspect("https://handbook.novu.co/write-in-our-blog", "Novu Handbook");
await inspect("https://www.logicspice.com/submit-guest-post", "LogicSpice (verify)");
await inspect("https://techlabari.com/article-submission/", "Tech Labari");

await browser.close();
fs.rmSync(new URL(import.meta.url).pathname);
