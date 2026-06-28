import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "../../src/content/articles");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".mdx"));

const wcRe = /[a-zA-Z0-9]+/g;
const reTitle = /^title: "(.+?)"/m;

for (const f of files) {
  const c = fs.readFileSync(path.join(dir, f), "utf-8");
  const body = c.replace(/---[\s\S]*?---\s*/, "").trim();
  const words = body.match(wcRe);
  const count = words ? words.length : 0;
  if (count < 1200) {
    const t = c.match(reTitle);
    console.log(count + " words: " + (t ? t[1].slice(0, 70) : f.slice(0, 50)));
  }
}
