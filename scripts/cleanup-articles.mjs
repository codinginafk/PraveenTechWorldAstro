import fs from "fs";
import path from "path";

const dir = "src/content/articles";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".mdx"));

let fixed = 0, imgAdded = 0;

for (const file of files) {
  const fp = path.join(dir, file);
  let content = fs.readFileSync(fp, "utf-8");
  const before = content;

  // 1. Replace em/en dashes with regular hyphen
  content = content.replace(/\u2014/g, "-").replace(/\u2013/g, "-");
  if (content !== before) fixed++;

  // 2. Add coverImage + imageAlt if missing
  const slug = file.replace(/\.mdx$/, "");
  const coverUrl = `https://picsum.photos/seed/${slug}/1200/600`;

  if (!content.includes("coverImage:")) {
    const alt = "Cover image for " + slug.replace(/-/g, " ");
    content = content.replace(
      /^(description:.*)$/m,
      `$1\ncoverImage: "${coverUrl}"\nimageAlt: "${alt}"`
    );
    imgAdded++;
  }

  fs.writeFileSync(fp, content, "utf-8");
  console.log(file + (content !== before ? " [dash fix]" : "") + (imgAdded ? " [image]" : ""));
}

console.log(`\nDone. ${fixed} files had em dashes fixed, ${imgAdded} files got images.`);
