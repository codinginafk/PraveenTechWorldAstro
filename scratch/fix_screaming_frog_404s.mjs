import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));

const replacements = [
  {
    oldUrl: "https://en.wikipedia.org/wiki/Core_web_vitals",
    newUrl: "https://en.wikipedia.org/wiki/Core_Web_Vitals"
  },
  {
    oldUrl: "https://en.wikipedia.org/wiki/Website_speed_optimization",
    newUrl: "https://en.wikipedia.org/wiki/Web_performance"
  },
  {
    oldUrl: "https://www.ed.gov/studentsafety/privacy/",
    newUrl: "https://www2.ed.gov/policy/gen/guid/fpco/ferpa/index.html"
  },
  {
    oldUrl: "https://developers.openai.com/api/docs/models/overview",
    newUrl: "https://platform.openai.com/docs/models"
  },
  {
    oldUrl: "https://github.com/Lightricks/LTX-2.3",
    newUrl: "https://github.com/Lightricks/LTX-Video"
  }
];

console.log("=== FIXING SCREAMING FROG EXTERNAL 4XX URLS ===");

let fixedCount = 0;

for (const file of files) {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  for (const r of replacements) {
    if (content.includes(r.oldUrl)) {
      content = content.replaceAll(r.oldUrl, r.newUrl);
      modified = true;
      console.log(`✅ Fixed in ${file}: ${r.oldUrl} -> ${r.newUrl}`);
      fixedCount++;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

console.log(`\nCompleted. Fixed ${fixedCount} broken external URLs across articles.`);
