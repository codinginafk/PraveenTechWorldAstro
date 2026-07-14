import fs from "node:fs";

const content = fs.readFileSync("scripts/mission_control.mjs", "utf8");
const lines = content.split("\n");

lines.forEach((line, idx) => {
  if (line.includes("evidence") && (line.includes("SELECT") || line.includes("db.prepare"))) {
    console.log(`L${idx + 1}: ${line.trim()}`);
    console.log(`  Context:\n${lines.slice(Math.max(0, idx - 5), idx + 8).join("\n")}`);
  }
});
