import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "../../src/content/articles");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".mdx"));

const reTitle = /^title: "(.+?)"/m;
const reSeo = /^seoTitle: "(.+?)"/m;

let fixes = 0;
for (const f of files) {
  const fp = path.join(dir, f);
  let content = fs.readFileSync(fp, "utf-8");

  const t = content.match(reTitle);
  const s = content.match(reSeo);

  if (t && s && t[1] !== s[1]) {
    // seoTitle is stale — update it to match current title
    content = content.replace(reSeo, `seoTitle: "${t[1]}"`);
    fs.writeFileSync(fp, content, "utf-8");
    console.log("  Fixed seoTitle for: " + f.slice(0, 50));
    fixes++;
  }
}

console.log("\nFixed " + fixes + " stale seoTitle fields");
