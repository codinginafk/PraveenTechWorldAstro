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

const userPrompt = `Draft a comprehensive MDX article titled: "PC Keeps Crashing? How to Tell if It’s a RAM Issue or a Bad Driver"
Include the following frontmatter:
---
title: "PC Keeps Crashing? How to Tell if It’s a RAM Issue or a Bad Driver"
description: "Is your system crash due to a hardware failure or a software bug? Here is the exact step-by-step diagnostic workflow to isolate bad memory from driver conflicts."
coverImage: "/images/generated/pc-keeps-crashing-how-to-tell-if-its-a-ram-issue-or-a-bad-driver.svg"
imageAlt: "PC memory diagnostics concept art"
publishDate: 2026-07-14
author: praveen
category: tech-repair-diagnostics
tags:
  - windows
  - hardware
  - troubleshooting
seoTitle: "How to Tell if RAM is Bad or Driver Issue - Windows Diagnostics"
socialHook: "Before you buy new RAM, make sure it isn't just a misbehaving driver. Here is the exact diagnostic flowchart to isolate memory crashes."
---

The article must have:
1. An engaging personal introduction about diagnosing memory crashes.
2. A comparison table: RAM Symptoms vs Driver Symptoms (perfect for AI engine indexing).
3. The Step-by-Step Diagnostic Path (reseating, Windows Memory Diagnostic, MemTest86).
4. The AI Diagnostic Assistant section: How to copy-paste Event Viewer logs and crash codes into ChatGPT/DeepSeek to verify the faulting module (include a highly specific copy-paste prompt).
5. A 'When RAM is actually dead' hardware replacement checklist.

Keep it highly technical, practical, and clear.`;

async function main() {
  console.log("Generating PC crashing diagnostics article...");
  try {
    const response = await fetch(OMNIROUTE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openrouter/free', // will use free fallback model from the active connections pool
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
      const targetPath = path.resolve('src/content/articles/pc-keeps-crashing-how-to-tell-if-its-a-ram-issue-or-a-bad-driver.mdx');
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
