import fs from "node:fs";
import path from "node:path";

// Find files containing 'allowedConnectionIds' in the dist directory since it is compiled
function searchDist(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      searchDist(p);
    } else if (f.endsWith(".js")) {
      const content = fs.readFileSync(p, "utf8");
      if (content.includes("allowedConnectionIds") || content.includes("connectionIds")) {
        console.log("Found in file:", p);
        // Print lines containing the keyword
        const lines = content.split("\n");
        lines.forEach((line, idx) => {
          if (line.includes("allowedConnectionIds") || line.includes("connectionIds")) {
            console.log(`  L${idx + 1}: ${line.trim().slice(0, 150)}`);
          }
        });
      }
    }
  });
}

searchDist("C:\\Users\\bunny\\AppData\\Local\\npm-cache\\_npx\\44b85dff014d9ceb\\node_modules\\omniroute\\dist");
