import fs from "fs";
import path from "path";

const TRACKER_FILE = path.resolve(import.meta.dirname, "outreach-tracker.md");

function exists() {
  return fs.existsSync(TRACKER_FILE);
}

function read() {
  if (!exists()) return "";
  return fs.readFileSync(TRACKER_FILE, "utf-8");
}

export function logSent(target, pitch) {
  const entry = [
    `## ${target.name}`,
    `- **URL:** ${target.url}`,
    `- **Email:** ${target.email || "unknown"}`,
    `- **Date:** ${new Date().toISOString().split("T")[0]}`,
    `- **Pitch Topic:** ${pitch?.article?.title || target.pitchAngle}`,
    `- **Status:** SENT`,
    `- **Follow-up:** pending`,
    "",
  ].join("\n");

  fs.appendFileSync(TRACKER_FILE, entry + "\n");
  console.log(`  [Tracker] Logged: ${target.name}`);
}

export function logResult(name, status, detail = "") {
  const entry = `  - **Result:** ${status} ${detail}\n`;
  fs.appendFileSync(TRACKER_FILE, entry);
}

export function getRecent(count = 10) {
  const content = read();
  const sections = content.split("## ").filter(Boolean);
  return sections.slice(-count);
}

export function getStatus() {
  const content = read();
  const sent = (content.match(/Status:\s*SENT/g) || []).length;
  const accepted = (content.match(/Result:\s*ACCEPTED/g) || []).length;
  const rejected = (content.match(/Result:\s*REJECTED/g) || []).length;
  return { sent, accepted, rejected };
}
