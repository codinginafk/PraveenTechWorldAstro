import fs from "node:fs";

const filePath = "C:/Users/bunny/AppData/Local/npm-cache/_npx/44b85dff014d9ceb/node_modules/omniroute/dist/.build/next/server/chunks/_15efgdz._.js";

const content = fs.readFileSync(filePath, "utf8");

let matchIdx = content.indexOf("handleNoCredentials");
let count = 1;
while (matchIdx !== -1) {
  console.log(`\nMatch #${count} at position ${matchIdx}:`);
  console.log(`Context:\n${content.slice(Math.max(0, matchIdx - 1000), matchIdx + 500)}`);
  matchIdx = content.indexOf("handleNoCredentials", matchIdx + 1);
  count++;
}
