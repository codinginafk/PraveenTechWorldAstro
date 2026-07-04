import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");

function splitArticle(content) {
  const parts = content.split("---");
  const frontmatter = parts[1];
  const body = parts.slice(2).join("---");
  return { frontmatter, body };
}

function isolateCodeBlocks(body) {
  const codeBlocks = [];
  const regex = /```[\s\S]*?```/g;
  const cleanBody = body.replace(regex, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length - 1}__`;
  });
  return { cleanBody, codeBlocks };
}

function restoreCodeBlocks(cleanBody, codeBlocks) {
  let restored = cleanBody;
  for (let i = 0; i < codeBlocks.length; i++) {
    restored = restored.replace(`__CODE_BLOCK_PLACEHOLDER_${i}__`, codeBlocks[i]);
  }
  return restored;
}

// Read all mdx files in src/content/articles
const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"));
let count = 0;
for (const file of files) {
  const filePath = path.join(ARTICLES_DIR, file);
  const content = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = splitArticle(content);
  const { cleanBody, codeBlocks } = isolateCodeBlocks(body);
  
  if (cleanBody.includes("—") || cleanBody.includes("–")) {
    console.log(`Stripping dashes from: ${file}`);
    // Replace em dashes and en dashes with a comma and space, then collapse multiple spaces/commas if any
    let strippedBody = cleanBody.replace(/—/g, ", ").replace(/–/g, ", ");
    // Clean up spaces around commas to keep it natural
    strippedBody = strippedBody.replace(/\s*,\s*/g, ", ").replace(/,\s*,/g, ",");
    
    const restoredBody = restoreCodeBlocks(strippedBody, codeBlocks);
    const finalContent = `---\n${frontmatter}\n---\n\n${restoredBody}\n`;
    fs.writeFileSync(filePath, finalContent, "utf-8");
    count++;
  }
}
console.log(`Dashes stripping complete! Cleaned ${count} articles.`);
