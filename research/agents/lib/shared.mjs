import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(__filename, "../../../..");
const REPORTS_DIR = path.join(ROOT_DIR, "research/reports");
const SOURCES_DIR = path.join(ROOT_DIR, "research/sources");

// Load .env from project root
try {
  const envPath = path.join(ROOT_DIR, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const eqIdx = trimmed.indexOf("=");
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        process.env[k] = process.env[k] || v;
      }
    }
  }
} catch { /* ignore */ }

export function loadConfig() {
  const configPath = path.join(SOURCES_DIR, "config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

export function getReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  return REPORTS_DIR;
}

export function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function formatDate(date) {
  return date.toISOString().split("T")[0];
}

export function writeReport(reportDir, filename, content) {
  const dir = path.join(getReportsDir(), reportDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`  Wrote: ${filePath}`);
  return filePath;
}

export async function fetchXML(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PraveenTechWorld-Research/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.error(`  [fetchXML error] ${url}: ${err.message}`);
    return null;
  }
}

export function getCurrentsKey() {
  return process.env.CURRENTS_API_KEY || "";
}

export function getGAId() {
  return process.env.PUBLIC_GA_ID || "G-TR2F3NPMVN";
}

export function log(...args) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}]`, ...args);
}

export function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function fetchJSON(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "PraveenTechWorld-Research/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`  [fetchJSON error] ${url}: ${err.message}`);
    return null;
  }
}

export async function callLLM(systemPrompt, userPrompt, opts = {}) {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || "https://opencode.ai/zen/v1";
  const model = process.env.LLM_MODEL || "mimo-v2.5-free";

  if (!apiKey) {
    console.warn("  [callLLM] No LLM_API_KEY in env. Faking response.");
    return `[LLM unavailable - no API key configured]`;
  }

  const body = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 4096,
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeout ?? 120000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM API ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content || "";
}
