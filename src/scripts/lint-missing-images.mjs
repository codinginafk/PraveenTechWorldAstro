import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const MAX_BYTES = 150 * 1024;
const MAX_DIM = 1600;

// dimension readers (no deps)
function imageDims(buf, ext) {
  try {
    if (ext === ".png" && buf.length > 24) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    if (ext === ".gif" && buf.length > 10) return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
    if (ext === ".jpg" || ext === ".jpeg") {
      let i = 2;
      while (i < buf.length - 8) {
        if (buf[i] !== 0xFF) { i++; continue; }
        const m = buf[i + 1];
        if (m === 0xD8 || m === 0xD9 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
        const len = buf.readUInt16BE(i + 2);
        if (m >= 0xC0 && m <= 0xC3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        i += 2 + len;
      }
    }
  } catch { /* fall through */ }
  return null;
}
const BUDGET_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]);

function checkBudget(file, imgPath, fullPath) {
  const stat = fs.statSync(fullPath);
  if (stat.size > MAX_BYTES) {
    errors.push(`❌ ${file}: image '${imgPath}' is ${Math.round(stat.size / 1024)}KB (budget ${MAX_BYTES / 1024}KB) — recompress to ≤1200px wide before committing`);
    return;
  }
  const ext = path.extname(fullPath).toLowerCase();
  if (BUDGET_EXTS.has(ext)) {
    const d = imageDims(fs.readFileSync(fullPath), ext === ".jpeg" ? ".jpg" : ext);
    if (d && Math.max(d.w, d.h) > MAX_DIM) {
      errors.push(`❌ ${file}: image '${imgPath}' is ${d.w}x${d.h} (max dimension ${MAX_DIM}px) — resize before committing`);
    }
  }
}

function toLocal(fullImgPath) {
  let relativePath = fullImgPath;
  try {
    if (/^https?:\/\//i.test(fullImgPath)) {
      const u = new URL(fullImgPath);
      if (u.hostname.endsWith("praveentechworld.com")) relativePath = u.pathname;
      else return null; // third-party hotlink: out of scope for the budget
    }
  } catch { return null; }
  relativePath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  if (relativePath.includes("..")) return null;
  return path.join(PUBLIC_DIR, relativePath);
}

const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"));
const errors = [];

files.forEach(file => {
  const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf-8");
  const content = raw;
  // strip fenced code blocks: ```html examples are teaching material, not real images
  const prose = raw.replace(/```[\s\S]*?```/g, "\n").replace(/~~~[\s\S]*?~~~/g, "\n");
  const isDraft = /draft:\s*true/.test(content);

  // collect every local image ref: coverImage + markdown body images + <img> tags
  const refs = new Set();
  const cover = content.match(/coverImage:\s*"([^"]+)"/);
  if (cover) refs.add(cover[1].trim());
  for (const m of prose.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) refs.add(m[1].trim());
  for (const m of prose.matchAll(/<img[^>]+src="([^"]+)"/g)) refs.add(m[1].trim());

  if (!cover && !isDraft) {
    errors.push(`❌ ${file}: Missing 'coverImage' frontmatter tag`);
  }
  // Budgets apply to drafts too (early warning — the scheduler publishes without re-checking).
  // Missing-file errors apply to published articles only.
  for (const imgPath of refs) {
    if (!imgPath || imgPath.startsWith("data:") || imgPath.startsWith("#")) continue;
    const fullPath = toLocal(imgPath);
    if (!fullPath) continue; // third-party hotlink: out of scope
    if (!fs.existsSync(fullPath)) {
      if (!isDraft) errors.push(`❌ ${file}: image file '${imgPath}' does not exist in public/`);
    } else if (BUDGET_EXTS.has(path.extname(fullPath).toLowerCase())) {
      checkBudget(file, imgPath, fullPath);
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
