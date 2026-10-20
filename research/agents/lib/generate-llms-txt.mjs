export * from "../../../src/scripts/generate-llms-txt.mjs";
import { generateLlmsTxt, generateLlmsFullTxt, updateRobotsTxt } from "../../../src/scripts/generate-llms-txt.mjs";
import { fileURLToPath } from "url";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateLlmsTxt();
  generateLlmsFullTxt();
  updateRobotsTxt();
  console.log("\nDone.");
}
