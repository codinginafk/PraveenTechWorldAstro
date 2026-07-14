import fs from "node:fs";
import path from "node:path";

const searchDir = "C:\\Users\\bunny\\AppData\\Local\\npm-cache\\_npx\\44b85dff014d9ceb\\node_modules\\omniroute";

function search(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath);
    } else if (stat.isFile() && item.endsWith(".js")) {
      try {
        const content = fs.readFileSync(fullPath, "utf8");
        if (content.includes("No active credentials for provider")) {
          console.log(`Found in: ${fullPath}`);
          // Print surrounding lines
          const lines = content.split("\n");
          lines.forEach((line, idx) => {
            if (line.includes("No active credentials for provider")) {
              console.log(`  L${idx + 1}: ${line.trim()}`);
              console.log(`  Context:\n${lines.slice(Math.max(0, idx - 5), idx + 10).join("\n")}`);
            }
          });
        }
      } catch {}
    }
  }
}

search(searchDir);
