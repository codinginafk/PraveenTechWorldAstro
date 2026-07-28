import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";

const trims = [
  {
    file: "bitlocker-recovery-screen-loop-after-windows-update.mdx",
    oldDesc: "Locked out of Windows 11 by a BitLocker recovery loop after the latest security update? Here are 5 IT-tested fixes, from TPM PCR resets to manage-bde CLI recovery.",
    newDesc: "Locked out of Windows 11 by a BitLocker recovery loop after an update? Here are 5 IT fixes, from TPM PCR resets to manage-bde CLI recovery."
  },
  {
    file: "gemini-3-6-flash-honest-review-production-use.mdx",
    oldDesc: "After 48 hours of stress-testing Gemini 3.6 Flash on real sysadmin and code gen tasks, here is where it genuinely shines and where it quietly broke our workflow.",
    newDesc: "After 48 hours of stress-testing Gemini 3.6 Flash on sysadmin and code tasks, here is where it shines and where it broke our workflow."
  },
  {
    file: "ai-content-auditor-scored-my-blog-articles.mdx",
    oldDesc: "I built a Python tool that scored all 69 articles on my blog across 7 metrics. The median score was 55/100. Here is what the audit found and how I fixed 350 issues.",
    newDesc: "I built a Python tool that scored 69 articles on my blog across 7 metrics. Here is what the audit found and how I fixed 350 issues."
  },
  {
    file: "how-to-set-up-fooocus-locally-gpu-guide.mdx",
    oldDesc: "Tired of cloud credits and image paywalls? Learn how to install and run Fooocus locally on Windows with an NVIDIA GPU for unlimited, free FLUX.2 image generation.",
    newDesc: "Tired of image paywalls? Learn how to install and run Fooocus locally on Windows with an NVIDIA GPU for free FLUX.2 image generation."
  },
  {
    file: "how-to-tell-if-your-ram-is-bad-a-step-by-step-pc-diagnostics-guide.mdx",
    oldDesc: "I’ve spent countless hours hunched over a workbench, a multimeter in one hand and a screwdriver in the other, watching a system that once booted like a charm no...",
    newDesc: "Workbench diagnostic guide: Learn how to isolate bad RAM modules, MEMORY_MANAGEMENT BSODs, and MemTest86 errors step by step."
  },
  {
    file: "debull-tooling-abuses-microsoft-device-code-flow-to-target-m365-accounts.mdx",
    oldDesc: "We built this around Conditional Access policies in Azure AD to block M365 device code flow attacks, though it came with tradeoffs we're still working through....",
    newDesc: "Learn how attackers abuse Microsoft 365 device code flow and how to configure Conditional Access policies in Azure AD to block them."
  },
  {
    file: "gemini-3-6-flash-vs-3-5-flash-complete-guide.mdx",
    oldDesc: "Google released Gemini 3.6 Flash, 3.5 Flash-Lite and 3.5 Flash Cyber with minimal fanfare. Here is everything: benchmarks, pricing, what is great, and what broke.",
    newDesc: "Google released Gemini 3.6 Flash and 3.5 Flash-Lite. Here is our workbench comparison: benchmarks, pricing, what is great, and what broke."
  }
];

console.log("=== TRIMMING META DESCRIPTIONS UNDER 155 CHARS ===");

trims.forEach(item => {
  const filePath = path.join(articlesDir, item.file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, "utf8");
    content = content.replace(item.oldDesc, item.newDesc);
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Trimmed ${item.file}: New length ${item.newDesc.length} chars`);
  }
});
