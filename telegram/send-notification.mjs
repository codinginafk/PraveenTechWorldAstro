#!/usr/bin/env node

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {
  // .env not found—rely on system environment
}

import {
  notifyOpportunity,
  notifyBriefReady,
  notifyDraftReady,
  notifyWeeklyDigest,
  notifyError,
} from "./bot.mjs";

const [cmd, ...args] = process.argv.slice(2);

async function main() {
  switch (cmd) {
    case "opportunity":
      await notifyOpportunity(args[0] || "general", parseInt(args[1]) || 0);
      break;
    case "brief":
      await notifyBriefReady(args[0] || "Unknown topic", args[1] || "unknown");
      break;
    case "draft":
      await notifyDraftReady(args[0] || "Unknown topic", args[1] || "unknown");
      break;
    case "digest":
      await notifyWeeklyDigest(args[0] || "No summary provided.");
      break;
    case "error":
      await notifyError(args[0] || "Unknown context", args[1] || "Unknown error");
      break;
    default:
      console.log(`
Usage: node telegram/send-notification.mjs <command> [args]

Commands:
  opportunity <category> <count>   Send opportunity report notification
  brief       <topic> <filename>   Send research brief notification
  draft       <topic> <filename>   Send draft article notification
  digest      <summary>            Send weekly digest
  error       <context> <msg>      Send error notification

Examples:
  node telegram/send-notification.mjs opportunity "ai-tools" 15
  node telegram/send-notification.mjs brief "ChatGPT for Excel" "chatgpt-excel-brief.md"
  node telegram/send-notification.mjs draft "Learn Excel with AI" "excel-ai-draft.md"
      `);
  }
}

main().catch(console.error);
