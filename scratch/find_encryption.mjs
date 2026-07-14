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
        if (content.includes("STORAGE_ENCRYPTION_KEY") || content.includes("decrypt(")) {
          console.log(`Found encryption/decryption reference in: ${fullPath}`);
          // Search for occurrences
          const lines = content.split("\n");
          lines.forEach((line, idx) => {
            if (line.includes("STORAGE_ENCRYPTION_KEY") || line.includes("encrypt(") || line.includes("decrypt(")) {
              if (line.length < 500) {
                console.log(`  L${idx + 1}: ${line.trim()}`);
              }
            }
          });
        }
      } catch {}
    }
  }
}

search(searchDir);
