import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "../../src/content/articles");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".mdx"));

const reTitle = /^title: "(.+?)"/m;
let unchanged = 0;
for (const f of files) {
  const c = fs.readFileSync(path.join(dir, f), "utf-8");
  const t = c.match(reTitle);
  if (t) {
    const hasHook = t[1].includes("?") || t[1].includes("\u2014") || t[1].includes("\u2705") || t[1].includes("(") || t[1].includes(":");
    if (!hasHook) {
      console.log("  " + t[1].slice(0, 80));
      unchanged++;
    }
  }
}
console.log("\nUnoptimized titles remaining: " + unchanged);
