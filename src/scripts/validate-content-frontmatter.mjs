import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const articlesDir = path.join(root, "src/content/articles");
const files = fs.readdirSync(articlesDir).filter((file) => file.endsWith(".mdx")).sort();
const errors = [];

function frontmatterFor(file) {
  const content = fs.readFileSync(path.join(articlesDir, file), "utf8").replace(/^\uFEFF/, "");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    errors.push(`${file}: missing a frontmatter block`);
    return "";
  }
  return match[1];
}

function scalar(frontmatter, key) {
  const line = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  return line?.[1]?.trim() || "";
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

for (const file of files) {
  const frontmatter = frontmatterFor(file);
  if (!frontmatter) continue;

  const description = unquote(scalar(frontmatter, "description"));
  if (!description) errors.push(`${file}: missing description`);
  if (description.length > 165) errors.push(`${file}: description is ${description.length} characters (maximum 165)`);

  if (!scalar(frontmatter, "title")) errors.push(`${file}: missing title`);
  if (!scalar(frontmatter, "publishDate")) errors.push(`${file}: missing publishDate`);
  if (!scalar(frontmatter, "author")) errors.push(`${file}: missing author`);
  if (!scalar(frontmatter, "category")) errors.push(`${file}: missing category`);

  const referencesStart = frontmatter.search(/^references:\s*$/m);
  if (referencesStart !== -1) {
    const references = frontmatter.slice(referencesStart);
    const items = references.split(/^\s+-\s+/m).slice(1);
    if (!items.length) errors.push(`${file}: references must contain at least one item`);
    for (const item of items) {
      if (/^\s*label:/m.test(item)) errors.push(`${file}: references use title, not label`);
      if (!/^\s*title:\s*\S+/m.test(item)) errors.push(`${file}: reference item is missing title`);
      if (!/^\s*url:\s*["']?https?:\/\//m.test(item)) errors.push(`${file}: reference item is missing an http(s) URL`);
    }
  }
}

if (errors.length) {
  console.error(`❌ Frontmatter validation failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`✅ Frontmatter validation passed for ${files.length} article files.`);
