import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const OMNIROUTE_URL = 'http://localhost:20128/v1/chat/completions';

const systemPrompt = `You are a 20-year veteran IT Systems Administrator and hardware repair technician who builds in public. You write in a highly natural, authoritative, firsthand human voice.
Apply the local humanizer rules:
- No corporate jargon, hype, or generic AI buzzwords.
- Use direct, conversational, yet technical language.
- Speak in the first person ("In my experience", "When I troubleshoot this", "I've seen").
- Use varied sentence lengths. No predictable structural patterns (e.g. starting every sentence with "-ing" verbs).
- Structure the content to be highly retrieval-friendly for AI Search Engines (GEO): use markdown comparison tables, clear lists, code blocks, and copy-paste prompt templates.`;

const userPrompt = `Draft a comprehensive MDX article titled: "How to Tell If Your RAM Is Bad: A Step-by-Step PC Diagnostics Guide"
Include the following frontmatter:
---
title: "How to Tell If Your RAM Is Bad: A Step-by-Step PC Diagnostics Guide"
description: "Is your PC freezing, rebooting, or failing to boot? Here are the 5 warning signs of failing RAM and how to run a professional memory diagnostic."
coverImage: "/images/generated/how-to-tell-if-your-ram-is-bad-step-by-step-guide.svg"
imageAlt: "PC RAM diagnostics bench concept"
publishDate: 2026-07-14
author: praveen
category: tech-repair-diagnostics
tags:
  - windows
  - hardware
  - troubleshooting
seoTitle: "How to Tell If Your RAM Is Bad: Memory Diagnostic Guide"
socialHook: "PC freezing or failing to boot? Don't buy new memory yet. Here is the exact diagnostic workflow to test if your RAM is actually dead."
---

The article must have:
1. An engaging personal introduction about hardware diagnostics on the test bench.
2. A list of the 5 Warning Signs of Failing RAM (Beep codes on startup, random freezes, repeating BSODs, file corruption, degraded system performance).
3. The Hardware Reseat and Slot Isolation process.
4. Detailed steps on running the Windows Memory Diagnostic and PassMark MemTest86.
5. The AI Diagnostic Assistant section: A copy-paste prompt to feed RAM error dumps to ChatGPT/DeepSeek to find if it is a specific memory address failing (suggesting slot problems vs DIMM issues).
6. A clear link back to our first article (PC Keeps Crashing? How to Tell if It’s a RAM Issue or a Bad Driver) if their RAM tests clean, as it means a driver is the culprit.

Keep it highly technical, practical, and clear.`;

async function main() {
  console.log("Generating bad RAM diagnostics article...");
  try {
    const response = await fetch(OMNIROUTE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        stream: false
      })
    });

    const data = await response.json();
    if (data.choices && data.choices[0]) {
      const content = data.choices[0].message.content;
      const targetPath = path.resolve('src/content/articles/how-to-tell-if-your-ram-is-bad-step-by-step-guide.mdx');
      fs.writeFileSync(targetPath, content, 'utf8');
      console.log("Successfully wrote generated MDX article to:", targetPath);
    } else {
      console.error("Failed to generate content:", data);
    }
  } catch (err) {
    console.error("Error connecting to OmniRoute server:", err.message);
  }
}

main();
