import fs from "node:fs";

const filePath = "C:/Users/bunny/AppData/Local/npm-cache/_npx/44b85dff014d9ceb/node_modules/omniroute/dist/.build/next/server/chunks/_15efgdz._.js";

const content = fs.readFileSync(filePath, "utf8");
const lines = content.split("\n");

lines.forEach((line, idx) => {
  const matchIdx = line.indexOf("No active credentials for provider");
  if (matchIdx !== -1) {
    console.log(`Found credential logic at L${idx + 1}`);
    console.log(`Context:\n${line.slice(Math.max(0, matchIdx - 2000), matchIdx + 200)}`);
  }
});
