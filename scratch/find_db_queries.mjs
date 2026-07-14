import fs from "node:fs";

const filePath = "C:/Users/bunny/AppData/Local/npm-cache/_npx/44b85dff014d9ceb/node_modules/omniroute/dist/open-sse/mcp-server/server.js";

const content = fs.readFileSync(filePath, "utf8");
const lines = content.split("\n");

lines.forEach((line, idx) => {
  if (line.includes("provider_connections") || line.includes("SELECT") && line.includes("provider =")) {
    if (line.length < 500) {
      console.log(`L${idx + 1}: ${line.trim()}`);
      console.log(`  Context:\n${lines.slice(Math.max(0, idx - 3), idx + 8).join("\n")}`);
    }
  }
});
