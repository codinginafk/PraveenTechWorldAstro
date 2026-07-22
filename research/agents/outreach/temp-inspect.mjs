import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://newyorkcomputerhelp.com/write-for-us/");
await page.waitForTimeout(2000);
console.log("Title:", await page.title());
const fields = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("input, textarea")).map(el => ({
    name: el.name || "(no name)",
    type: el.type || "",
    placeholder: el.placeholder || "",
    id: el.id || "",
  }));
});
console.log("Fields:", JSON.stringify(fields, null, 2));
// Also try Techydialogue
await page.goto("https://www.techydialogue.com/write-for-us/");
await page.waitForTimeout(2000);
console.log("\nTechy Dialogue Title:", await page.title());
const fields2 = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("input, textarea")).map(el => ({
    name: el.name || "(no name)",
    type: el.type || "",
    placeholder: el.placeholder || "",
  }));
});
console.log("Fields:", JSON.stringify(fields2, null, 2));
await browser.close();
import fs from "fs";
fs.rmSync(new URL(import.meta.url).pathname);
