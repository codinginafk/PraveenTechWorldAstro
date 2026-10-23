/**
 * generate-webp.mjs — write a `.webp` sibling next to every raster image in
 * public/images so article heroes and cards can be served 45% lighter.
 *
 * Deliberately NOT part of `npm run build`:
 *   - the committed .webp files are the artifact, and
 *   - a missing .webp is harmless: getWebpSibling() only emits a <source> when
 *     the file exists, so the page falls back to the original JPEG.
 * That keeps the Vercel build free of a sharp dependency and a resvg pass.
 *
 * Run after adding or replacing a cover image:
 *   npm run images:webp
 *
 * Originals are never modified: og:image, JSON-LD and every external reference
 * keep pointing at the JPEG/PNG.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("public/images");

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error("[webp] sharp is not installed — skipping (pages fall back to JPEG)");
  process.exit(0);
}

if (!fs.existsSync(ROOT)) {
  console.error("[webp] public/images not found");
  process.exit(0);
}

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(jpe?g|png)$/i.test(entry.name)) files.push(full);
  }
})(ROOT);

let made = 0;
let skipped = 0;
let bytesIn = 0;
let bytesOut = 0;
let small = 0;

const SMALL_WIDTH = 800; // cards and mobile heroes never need more than this

for (const file of files) {
  const out = file.replace(/\.(jpe?g|png)$/i, ".webp");
  const inSize = fs.statSync(file).size;
  bytesIn += inSize;

  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(file).mtimeMs) {
    skipped++;
    bytesOut += fs.statSync(out).size;
  } else {
    try {
      await sharp(file)
        .webp({ quality: inSize > 80 * 1024 ? 76 : 82, effort: 5 })
        .toFile(out);
      bytesOut += fs.statSync(out).size;
      made++;
    } catch (error) {
      console.error(`[webp] failed ${path.relative(ROOT, file)}: ${error.message}`);
    }
  }

  // A narrower variant for small viewports: a 390px-wide phone at 2x needs
  // ~780px, not the 1200-1400px desktop cover.
  const smallOut = file.replace(/\.(jpe?g|png)$/i, `-${SMALL_WIDTH}w.webp`);
  try {
    const meta = await sharp(file).metadata();
    if ((meta.width || 0) > SMALL_WIDTH) {
      if (!(fs.existsSync(smallOut) && fs.statSync(smallOut).mtimeMs >= fs.statSync(file).mtimeMs)) {
        await sharp(file).resize({ width: SMALL_WIDTH, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(smallOut);
        small++;
      }
    }
  } catch (error) {
    console.error(`[webp] small variant failed ${path.relative(ROOT, file)}: ${error.message}`);
  }
}

const mb = (n) => (n / 1024 / 1024).toFixed(2);
const saved = bytesIn > 0 ? Math.round((1 - bytesOut / bytesIn) * 100) : 0;
console.log(`[webp] converted ${made}, skipped ${skipped} (up to date)`);
console.log(`[webp] raster ${mb(bytesIn)} MB -> webp ${mb(bytesOut)} MB (${saved}% smaller)`);
