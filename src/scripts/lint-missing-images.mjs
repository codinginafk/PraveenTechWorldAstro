import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

// Budget guard: covers must stay web-sized or the PR fails (prevents 8MB uploads).
// Pure-node JPEG SOF dimension reader (no deps).
function jpegDims(buf) {
  let i = 2;
  while (i < buf.length - 8) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const m = buf[i + 1];
    if (m === 0xD8 || m === 0xD9 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    if (m >= 0xC0 && m <= 0xC3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}
const MAX_BYTES = 150 * 1024;
const MAX_DIM = 1600;

const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"));
const errors = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf-8");
  if (/draft:\s*true/.test(content)) return; // Skip draft articles

  const match = content.match(/coverImage:\s*"([^"]+)"/);
  const imgPath = match ? match[1].trim() : null;

  if (!imgPath) {
    errors.push(`❌ ${file}: Missing 'coverImage' frontmatter tag`);
  } else {
    let relativePath = imgPath;
    try {
      if (/^https?:\/\//i.test(imgPath)) {
        relativePath = new URL(imgPath).pathname;
      }
    } catch {
      relativePath = imgPath;
    }
    relativePath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
    const fullPath = path.join(PUBLIC_DIR, relativePath);
    if (!fs.existsSync(fullPath)) {
      errors.push(`❌ ${file}: coverImage file '${imgPath}' does not exist in public/`);
    } else if (/\.(jpe?g)$/i.test(fullPath)) {
      const stat = fs.statSync(fullPath);
      if (stat.size > MAX_BYTES) {
        errors.push(`❌ ${file}: coverImage '${imgPath}' is ${Math.round(stat.size / 1024)}KB (budget ${MAX_BYTES / 1024}KB) — recompress to ≤1200px wide before committing`);
      }
      try {
        const d = jpegDims(fs.readFileSync(fullPath));
        if (d && Math.max(d.w, d.h) > MAX_DIM) {
          errors.push(`❌ ${file}: coverImage '${imgPath}' is ${d.w}x${d.h} (max dimension ${MAX_DIM}px) — resize before committing`);
        }
      } catch { /* unreadable image: build will surface it */ }
    }
  }
});

if (errors.length > 0) {
  console.error("\n=== Image Linting Errors Detected ===");
  errors.forEach(err => console.error(err));
  console.error(`\nTotal broken/missing cover images: ${errors.length}\n`);
  process.exit(1);
} else {
  console.log(`✅ Image Linting Passed: All ${files.length} articles have valid cover images.`);
}
