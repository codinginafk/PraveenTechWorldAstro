import fs from 'node:fs';
import path from 'node:path';

const searchDir = "C:/Users/bunny/AppData/Local/npm-cache/_npx/44b85dff014d9ceb/node_modules/omniroute";

function findFiles(dir, prefix = "") {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(findFiles(filePath, path.join(prefix, file)));
    } else {
      results.push(path.join(prefix, file));
    }
  }
  return results;
}

const allFiles = findFiles(searchDir);
console.log("=== Finding program or command files ===");
const matching = allFiles.filter(f => f.includes("program") || f.includes("command") || f.includes("api-key") || f.includes("key-manager") || f.includes("key"));
for (const m of matching) {
  console.log(m);
}
