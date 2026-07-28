import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";
const vercelJsonPath = "vercel.json";

console.log("=== COMPREHENSIVE INTERNAL LINK AUDITOR ===");

const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, "utf8"));
const redirects = new Map((vercelConfig.redirects || []).map(r => [r.source, r.destination]));

// Collect all valid article slugs
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));
const validArticleSlugs = new Set(files.map(f => f.replace(/\.mdx$/, "")));

// Valid static pages
const validStaticRoutes = new Set([
  "/", "/blog", "/guides", "/about", "/contact", "/privacy", "/terms", "/tools"
]);

const brokenLinks = [];

for (const file of files) {
  const filePath = path.join(articlesDir, file);
  const content = fs.readFileSync(filePath, "utf8");

  // Regex to find markdown links: [text](/blog/slug) or [text](/guides/cat)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const linkText = match[1];
    const linkTarget = match[2].trim();

    // Only inspect internal links starting with /
    if (linkTarget.startsWith("/") && !linkTarget.startsWith("//")) {
      const cleanPath = linkTarget.split("#")[0].split("?")[0].replace(/\/$/, "");

      let isValid = false;

      // Check if it's a valid blog link
      if (cleanPath.startsWith("/blog/")) {
        const slug = cleanPath.replace(/^\/blog\//, "");
        if (validArticleSlugs.has(slug) || redirects.has(cleanPath)) {
          isValid = true;
        }
      } else if (cleanPath.startsWith("/guides") || cleanPath.startsWith("/services")) {
        isValid = true; // categories and service redirects
      } else if (cleanPath.startsWith("/images/")) {
        const imgFile = path.join("public", cleanPath);
        if (fs.existsSync(imgFile)) isValid = true;
      } else if (validStaticRoutes.has(cleanPath) || redirects.has(cleanPath)) {
        isValid = true;
      }

      if (!isValid) {
        brokenLinks.push({
          sourceFile: file,
          linkText,
          linkTarget: cleanPath
        });
      }
    }
  }
}

console.log(`\nScan complete. Total files checked: ${files.length}`);
console.log(`Found ${brokenLinks.length} BROKEN INTERNAL LINKS:`);

brokenLinks.forEach((item, index) => {
  console.log(`  [${index + 1}] File: ${item.sourceFile}`);
  console.log(`      Text: "${item.linkText}"`);
  console.log(`      Target: ${item.linkTarget}`);
});

fs.writeFileSync("research/reports/broken_internal_links_report.json", JSON.stringify(brokenLinks, null, 2));
