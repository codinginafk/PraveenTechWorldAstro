import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));

console.log("=== REPLACING PLACEHOLDER ANCHOR TEXTS ===");

const replacements = [
  {
    targetUrl: "/blog/how-to-run-deepseek-r1-locally-on-8gb-vram",
    newAnchor: "how to run DeepSeek R1 locally on 8GB VRAM"
  },
  {
    targetUrl: "/blog/powershell-log-triage-tool-with-deepseek",
    newAnchor: "PowerShell log triage tool using local DeepSeek AI"
  },
  {
    targetUrl: "/blog/open-webui-ollama-rag-it-runbooks-setup",
    newAnchor: "Open WebUI and Ollama RAG setup for IT runbooks"
  },
  {
    targetUrl: "/blog/pc-keeps-crashing-how-to-tell-if-it-s-a-ram-issue-or-a-bad-driver",
    newAnchor: "how to tell if a PC crash is a RAM issue or bad driver"
  },
  {
    targetUrl: "/blog/will-factory-resetting-windows-fix-corrupted-user-profile",
    newAnchor: "will factory resetting Windows fix a corrupted user profile"
  },
  {
    targetUrl: "/blog/speed-up-your-slow-pc-in-2026-10-essential-windows-performance-tweaks",
    newAnchor: "10 essential Windows performance tweaks to speed up a slow PC"
  }
];

for (const file of files) {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  replacements.forEach(r => {
    const pattern = new RegExp(`\\[Anchor text\\]\\(${r.targetUrl.replace(/\//g, "\\/")}\\)`, "g");
    if (pattern.test(content)) {
      content = content.replace(pattern, `[${r.newAnchor}](${r.targetUrl})`);
      modified = true;
      console.log(`✅ Fixed anchor text in ${file} -> [${r.newAnchor}](${r.targetUrl})`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

console.log("Anchor text replacements completed.");
