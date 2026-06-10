import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "./shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.resolve(__dirname, "../state.json");

const MAX_DAILY_POSTS = 3;
const MIN_HOURS_BETWEEN = 3;
const JITTER_MINUTES = 15;

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export function checkLinkedInRateLimit() {
  const state = loadState();
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  if (state.linkedInPostDate !== today) {
    state.linkedInPostDate = today;
    state.linkedInDailyCount = 0;
  }

  if ((state.linkedInDailyCount || 0) >= MAX_DAILY_POSTS) {
    const tomorrow = new Date(now + 86400000).toISOString().slice(0, 10);
    return { allowed: false, reason: `Daily limit: ${state.linkedInDailyCount}/${MAX_DAILY_POSTS}. Next available: ${tomorrow}`, state };
  }

  const lastPost = state.linkedInLastPost ? new Date(state.linkedInLastPost).getTime() : 0;
  const hoursSinceLast = (now - lastPost) / 3600000;
  if (lastPost > 0 && hoursSinceLast < MIN_HOURS_BETWEEN) {
    const waitMinutes = Math.ceil(MIN_HOURS_BETWEEN * 60 - hoursSinceLast * 60);
    return { allowed: false, reason: `Cooldown: ${hoursSinceLast.toFixed(1)}h since last post. Wait ${waitMinutes}min (min ${MIN_HOURS_BETWEEN}h)`, state };
  }

  return { allowed: true, state };
}

export function recordLinkedInPost(result, state) {
  state.linkedInLastPost = new Date().toISOString();
  state.linkedInPostDate = new Date().toISOString().slice(0, 10);
  state.linkedInDailyCount = (state.linkedInDailyCount || 0) + 1;
  state.linkedInPostLog = state.linkedInPostLog || [];
  state.linkedInPostLog.push({
    time: state.linkedInLastPost,
    slug: result.slug || "unknown",
    url: result.postUrl || "",
    status: "published",
  });
  if (state.linkedInPostLog.length > 50) state.linkedInPostLog = state.linkedInPostLog.slice(-50);
  saveState(state);
}

export function recordLinkedInFailure(error, state) {
  state.linkedInPostLog = state.linkedInPostLog || [];
  state.linkedInPostLog.push({
    time: new Date().toISOString(),
    error: error.message || String(error),
    status: "failed",
  });
  if (state.linkedInPostLog.length > 50) state.linkedInPostLog = state.linkedInPostLog.slice(-50);
  saveState(state);
}

export function addJitter(baseMinutes) {
  const jitter = Math.round((Math.random() - 0.5) * 2 * JITTER_MINUTES);
  return Math.max(1, baseMinutes + jitter);
}

export function getRateLimitStatus() {
  const state = loadState();
  const today = new Date().toISOString().slice(0, 10);
  if (state.linkedInPostDate !== today) {
    return { dailyCount: 0, maxDaily: MAX_DAILY_POSTS, remainingToday: MAX_DAILY_POSTS, lastPost: state.linkedInLastPost || null };
  }
  return {
    dailyCount: state.linkedInDailyCount || 0,
    maxDaily: MAX_DAILY_POSTS,
    remainingToday: MAX_DAILY_POSTS - (state.linkedInDailyCount || 0),
    lastPost: state.linkedInLastPost || null,
  };
}

export async function withRetry(fn, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err.message || "";
      const is429 = msg.includes("429");
      if (is429 && attempt < maxRetries) {
        const wait = Math.pow(2, attempt) * 30;
        log(`[LinkedIn] 429 rate limited. Retry ${attempt + 1}/${maxRetries} in ${wait}s`);
        await new Promise(r => setTimeout(r, wait * 1000));
      } else if (attempt < maxRetries) {
        const wait = Math.pow(2, attempt) * 5;
        log(`[LinkedIn] Transient error. Retry ${attempt + 1}/${maxRetries} in ${wait}s`);
        await new Promise(r => setTimeout(r, wait * 1000));
      }
    }
  }
  throw lastError;
}
