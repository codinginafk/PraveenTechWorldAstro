import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"));
const errors = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf-8");
  const match = content.match(/coverImage:\s*"([^"]+)"/);
  const imgPath = match ? match[1].trim() : null;

  if (!imgPath) {
    errors.push(`❌ ${file}: Missing 'coverImage' frontmatter tag`);
  } else {
    const relativePath = imgPath.startsWith("/") ? imgPath.slice(1) : imgPath;
    const fullPath = path.join(PUBLIC_DIR, relativePath);
    if (!fs.existsSync(fullPath)) {
      errors.push(`❌ ${file}: coverImage file '${imgPath}' does not exist in public/`);
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
