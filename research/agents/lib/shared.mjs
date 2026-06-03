import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(__filename, "../../../..");

function loadEnv() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
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

loadEnv();
const REPORTS_DIR = path.join(ROOT_DIR, "research/reports");
const SOURCES_DIR = path.join(ROOT_DIR, "research/sources");

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

function getLLMConfig() {
  const key = process.env.LLM_API_KEY;
  const baseURL = process.env.LLM_BASE_URL || "https://opencode.ai/zen/v1";
  const model = process.env.LLM_MODEL || "deepseek-v4-flash";
  if (!key) return null;
  return { key, baseURL, model };
}

export async function callLLM(systemPrompt, userPrompt, options = {}) {
  const cfg = getLLMConfig();
  if (!cfg) {
    console.warn("  [LLM] No API key configured (set LLM_API_KEY in .env)");
    return null;
  }
  const { temperature = 0.3, maxTokens = 2048 } = options;
  try {
    const res = await fetch(`${cfg.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`  [LLM error] HTTP ${res.status}: ${err}`);
      return null;
    }
    const json = await res.json();
    const msg = json?.choices?.[0]?.message;
    let content = msg?.content?.trim();
    if (!content && msg?.reasoning_content) {
      content = msg.reasoning_content.trim();
    }
    if (!content) {
      console.warn("  [LLM] Empty response — model may have only returned reasoning");
      return null;
    }
    return content;
  } catch (err) {
    console.error(`  [LLM error] ${err.message}`);
    return null;
  }
}
