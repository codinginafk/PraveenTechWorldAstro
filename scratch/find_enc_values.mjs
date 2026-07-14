import fs from "node:fs";

const filePath = "C:/Users/bunny/AppData/Local/npm-cache/_npx/44b85dff014d9ceb/node_modules/omniroute/dist/open-sse/mcp-server/server.js";

const content = fs.readFileSync(filePath, "utf8");
const lines = content.split("\n");

lines.forEach((line, idx) => {
  if (line.includes("ALGORITHM =") || line.includes("PREFIX =") || line.includes("STATIC_SALT =") || line.includes("IV_LENGTH =") || line.includes("KEY_LENGTH =")) {
    if (line.length < 500) {
      console.log(`L${idx + 1}: ${line.trim()}`);
    }
  }
});
