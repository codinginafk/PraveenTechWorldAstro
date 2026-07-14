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
        if (content.includes("handleNoCredentials")) {
          console.log(`Found in: ${fullPath}`);
          // Print indices of occurrences
          let idx = content.indexOf("handleNoCredentials");
          while (idx !== -1) {
            console.log(`  Position ${idx}: ${content.slice(Math.max(0, idx - 200), idx + 200).replace(/\n/g, " ")}`);
            idx = content.indexOf("handleNoCredentials", idx + 1);
          }
        }
      } catch {}
    }
  }
}

search(searchDir);
