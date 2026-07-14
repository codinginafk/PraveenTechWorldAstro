import fs from "node:fs";

const filePath = "C:/Users/bunny/AppData/Local/npm-cache/_npx/44b85dff014d9ceb/node_modules/omniroute/dist/.build/next/server/chunks/[root-of-the-server]__0-zj3qy._.js";

const content = fs.readFileSync(filePath, "utf8");

let matchIdx = content.indexOf("handleNoCredentials");
console.log(`Found handleNoCredentials call at position ${matchIdx}`);
console.log(`Context:\n${content.slice(Math.max(0, matchIdx - 4000), matchIdx + 200)}`);
