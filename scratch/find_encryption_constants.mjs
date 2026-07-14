import fs from "node:fs";
import path from "node:path";

const filePath = "C:/Users/bunny/AppData/Local/npm-cache/_npx/44b85dff014d9ceb/node_modules/omniroute/dist/open-sse/mcp-server/server.js";

const content = fs.readFileSync(filePath, "utf8");
const lines = content.split("\n");

// Look for lines containing "ALGORITHM" or "PREFIX" near the line 4805
const startLine = Math.max(0, 4805 - 100);
const endLine = Math.min(lines.length, 4805 + 100);

for (let i = startLine; i < endLine; i++) {
  const line = lines[i];
  if (line.includes("ALGORITHM") || line.includes("PREFIX") || line.includes("SALT") || line.includes("KEY_LENGTH")) {
    console.log(`L${i + 1}: ${line.trim()}`);
  }
}
