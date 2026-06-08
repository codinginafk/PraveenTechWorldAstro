import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, "..", "state.json");

export function loadMemory() {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    return state.topicMemory || {};
  } catch {
    return {};
  }
}

export function saveMemory(memory) {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    state.topicMemory = memory;
    state.lastMemoryUpdate = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch {
    const state = { topicMemory: memory, lastMemoryUpdate: new Date().toISOString() };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  }
}

const GARBAGE_PATTERNS = [
  /^list of\s/i,
  /^category:/i,
  /^template:/i,
  /^help:/i,
  /^user:/i,
  /^file:/i,
  /^wikipedia/i,
  /^wikidata/i,
  /^\d{6,}$/,
  /^[^a-z0-9]{8,}$/i,
  /&#?\w+;/,
  /\\u[\da-f]{4}/i,
  /^login\?/i,
  /[\u200b-\u200f\u2028-\u206f\ufeff]/,
];

function isGarbageKey(key) {
  if (!key || key.length < 5) return true;
  if (GARBAGE_PATTERNS.some((p) => p.test(key))) return true;
  const clean = key.replace(/[^\w\s]/g, "").trim();
  if (clean.length < 4) return true;
  return false;
}

export function updateMemory(clusters) {
  const memory = loadMemory();
  const now = Date.now();

  // Prune garbage and stale entries before processing new data
  for (const [key, entry] of Object.entries(memory)) {
    if (isGarbageKey(key)) {
      delete memory[key];
      continue;
    }
    const ageDays = (now - new Date(entry.firstSeen).getTime()) / 86400000;
    if (ageDays > 7 && (entry.velocity || 0) < 3) {
      delete memory[key];
    }
  }

  for (const cluster of clusters) {
    const key = cluster.clusterKey;
    if (!memory[key]) {
      memory[key] = {
        firstSeen: new Date().toISOString(),
        dailyMentions: [],
        velocity: 0,
      };
    }

    const entry = memory[key];
    const today = new Date().toISOString().split("T")[0];
    const todayEntry = entry.dailyMentions.find((d) => d.date === today);
    if (todayEntry) {
      todayEntry.count += cluster.clusterSize;
    } else {
      entry.dailyMentions.push({ date: today, count: cluster.clusterSize });
      if (entry.dailyMentions.length > 7) {
        entry.dailyMentions = entry.dailyMentions.slice(-7);
      }
    }

    const last24h = entry.dailyMentions
      .filter((d) => {
        const diffMs = now - new Date(d.date).getTime();
        return diffMs < 86400000;
      })
      .reduce((sum, d) => sum + d.count, 0);

    entry.velocity = last24h;
    entry.lastSeen = new Date().toISOString();
  }

  saveMemory(memory);
  return memory;
}

export function getTrendingClusters(minVelocity = 3) {
  const memory = loadMemory();
  const trending = [];
  for (const [key, entry] of Object.entries(memory)) {
    if (entry.velocity >= minVelocity) {
      trending.push({ clusterKey: key, ...entry });
    }
  }
  trending.sort((a, b) => b.velocity - a.velocity);
  return trending;
}
