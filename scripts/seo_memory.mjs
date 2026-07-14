#!/usr/bin/env node
/**
 * scripts/seo_memory.mjs
 * ---------------------------------------------------------------------------
 * SEO Intelligence Memory System — 6-month retention with confidence scoring.
 *
 * Design decisions (borrowed from ECC instinct system + SkillOpt-Sleep):
 *   - Signals have a confidence score (0.0–1.0) and a TTL (default 6 months)
 *   - Signals from official sources (Google) start at 0.95 with 12-month TTL
 *   - Reinforcement: applying a signal to an article that performs well
 *     resets the TTL and bumps confidence by +0.1
 *   - Contradiction: applying a signal to an article that performs poorly
 *     drops confidence by -0.2. Below 0.3 = auto-expire
 *   - Staleness: signals unused for 3+ months get confidence halved
 *   - Deduplication: signals are keyed by a hash of their text to avoid
 *     re-ingesting the same insight from different sources
 *
 * Uses better-sqlite3 (sync) — consistent with mission_control.mjs.
 * Stored in seo_memory.sqlite (separate DB, separate concern).
 */

import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "..", "seo_memory.sqlite");

let _db;
export function getMemoryDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    migrateSchema(_db);
  }
  return _db;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

function migrateSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS intel_signals (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      signal_hash     TEXT NOT NULL UNIQUE,
      source          TEXT NOT NULL,        -- 'reddit_r_seo', 'reddit_r_bigseo', 'google_search_central', 'search_engine_roundtable', 'hackernews'
      source_url      TEXT,
      signal_text     TEXT NOT NULL,        -- The actionable insight, plain language
      category        TEXT NOT NULL,        -- e.g. 'algorithm_update', 'penalty', 'e_e_a_t'
      confidence      REAL NOT NULL,        -- 0.0 to 1.0
      is_verified     INTEGER DEFAULT 0,    -- 1 if official/corroborated, 0 if forum chatter
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_reinforced DATETIME,
      expires_at      DATETIME NOT NULL,    -- Evaluated dynamically (6 or 12 mo)
      times_applied   INTEGER DEFAULT 0,    -- How many artifacts used this
      times_helped    INTEGER DEFAULT 0,    -- How many times it correlated with good outcomes
      times_hurt      INTEGER DEFAULT 0,    -- How many times it correlated with bad outcomes
      is_expired      INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS signal_applications (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      signal_id           INTEGER NOT NULL,
      artifact_id         TEXT NOT NULL,
      applied_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
      outcome             TEXT,             -- 'positive', 'negative', null
      outcome_measured_at DATETIME,
      FOREIGN KEY(signal_id) REFERENCES intel_signals(id)
    );

    CREATE TABLE IF NOT EXISTS scout_runs (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      ran_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
      sources_checked  TEXT,    -- JSON array of source names
      signals_found    INTEGER DEFAULT 0,
      signals_expired  INTEGER DEFAULT 0,
      signals_deduplicated INTEGER DEFAULT 0
    );
  `);
}

// ─── Signal Hash (deduplication) ─────────────────────────────────────────────

export function hashSignal(text) {
  return crypto.createHash("sha256").update(text.toLowerCase().trim()).digest("hex").slice(0, 16);
}

// ─── Insert Signal ───────────────────────────────────────────────────────────

/**
 * Insert a new signal. Returns true if inserted, false if deduplicated.
 * @param {object} signal
 * @param {string} signal.source - e.g. 'reddit_r_seo'
 * @param {string} signal.sourceUrl
 * @param {string} signal.text - The actionable insight
 * @param {string} signal.category
 * @param {number} signal.confidence - 0.0 to 1.0
 * @param {number} [signal.ttlMonths=6] - How many months until expiry
 */
export function insertSignal({ source, sourceUrl, text, category, confidence, ttlMonths = 6 }) {
  const db = getMemoryDb();

  const hash = crypto.createHash("sha256").update(text.toLowerCase().trim()).digest("hex");
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + ttlMonths);

  // Determine verification status explicitly based on the source
  const isVerified = (source === "google_search_central" || source === "search_engine_roundtable") ? 1 : 0;

  try {
    db.prepare(`
      INSERT INTO intel_signals (signal_hash, source, source_url, signal_text, category, confidence, expires_at, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(hash, source, sourceUrl || null, text.trim(), category, confidence, expiry.toISOString(), isVerified);
    return true; // successfully inserted
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      // Signal already exists, just update its confidence/ttl if it's higher
      db.prepare(`
        UPDATE intel_signals
        SET confidence = MAX(confidence, ?),
            expires_at = MAX(expires_at, ?),
            is_verified = MAX(is_verified, ?)
        WHERE signal_hash = ?
      `).run(confidence, expiry.toISOString(), isVerified, hash);
      return false; // deduplicated
    }
    throw err;
  }
}

// ─── Get Active Signals ──────────────────────────────────────────────────────

/**
 * Get top active signals.
 */
export function getActiveSignals(minConfidence = 0.5) {
  const db = getMemoryDb();

  // First, expire anything past its TTL
  expireStaleSignals();

  return db.prepare(`
    SELECT id, source, source_url, signal_text, category, confidence, is_verified, created_at, expires_at, times_applied
    FROM intel_signals
    WHERE is_expired = 0
      AND confidence >= ?
    ORDER BY is_verified DESC, confidence DESC, created_at DESC
  `).all(minConfidence);
}

/**
 * Format active signals as a markdown section for injection into Writer prompts.
 */
export function formatSignalsForPrompt(maxSignals = 10) {
  const signals = getActiveSignals(0.5);
  if (signals.length === 0) return "";

  const top = signals.slice(0, maxSignals);
  let md = "## Current SEO Intelligence (auto-injected from seo_memory)\n";
  md += "Use these signals to determine which real evidence to select and emphasize. Do NOT force them if they don't naturally fit the topic's evidence.\n";
  md += "CRITICAL ANTI-PERFORMATIVE POLICY: Do NOT use performative phrasing like 'in my firsthand experience', 'as an expert', or 'when I tested this'. Expertise must be demonstrated solely through specific data, constraints faced, and real-world results.\n\n";

  for (const s of top) {
    const conf = (s.confidence * 100).toFixed(0);
    const badge = s.is_verified ? "VERIFIED FACT" : "HYPOTHESIS";
    md += `- **[${badge} | ${conf}% confidence | ${s.source}]** ${s.signal_text}\n`;
  }

  return md;
}

// ─── Reinforcement & Contradiction ───────────────────────────────────────────

/**
 * Call when a signal was applied to an article and the article performed WELL.
 * Resets TTL to 6 months and bumps confidence by +0.1 (capped at 1.0).
 */
export function reinforceSignal(signalId) {
  const db = getMemoryDb();
  const newExpiry = new Date();
  newExpiry.setMonth(newExpiry.getMonth() + 6);

  db.prepare(`
    UPDATE intel_signals
    SET confidence = MIN(1.0, confidence + 0.1),
        last_reinforced = CURRENT_TIMESTAMP,
        times_helped = times_helped + 1,
        expires_at = ?
    WHERE id = ? AND is_expired = 0
  `).run(newExpiry.toISOString(), signalId);
}

/**
 * Call when a signal was applied to an article and the article performed POORLY.
 * Drops confidence by -0.2. If below 0.3, auto-expire.
 */
export function contradictSignal(signalId) {
  const db = getMemoryDb();

  db.prepare(`
    UPDATE intel_signals
    SET confidence = MAX(0.0, confidence - 0.2),
        times_hurt = times_hurt + 1
    WHERE id = ? AND is_expired = 0
  `).run(signalId);

  // Auto-expire if confidence dropped below threshold
  db.prepare(`
    UPDATE intel_signals
    SET is_expired = 1
    WHERE id = ? AND confidence < 0.3
  `).run(signalId);
}

/**
 * Record that a signal was applied to an artifact.
 */
export function recordApplication(signalId, artifactId) {
  const db = getMemoryDb();

  db.prepare(`
    INSERT INTO signal_applications (signal_id, artifact_id)
    VALUES (?, ?)
  `).run(signalId, artifactId);

  db.prepare(`
    UPDATE intel_signals SET times_applied = times_applied + 1 WHERE id = ?
  `).run(signalId);
}

/**
 * Record the outcome of a signal application (called later, when we have data).
 */
export function recordOutcome(signalId, artifactId, outcome) {
  const db = getMemoryDb();

  db.prepare(`
    UPDATE signal_applications
    SET outcome = ?, outcome_measured_at = CURRENT_TIMESTAMP
    WHERE signal_id = ? AND artifact_id = ?
  `).run(outcome, signalId, artifactId);

  if (outcome === "positive") reinforceSignal(signalId);
  else if (outcome === "negative") contradictSignal(signalId);
}

// ─── Expiry & Staleness ─────────────────────────────────────────────────────

/**
 * Expire signals that:
 * 1. Are past their TTL
 * 2. Have been unused for 3+ months (halve confidence first; expire if < 0.3)
 */
export function expireStaleSignals() {
  const db = getMemoryDb();
  const now = new Date().toISOString();

  // 1. Hard expiry: past TTL
  const hardExpired = db.prepare(`
    UPDATE intel_signals
    SET is_expired = 1
    WHERE is_expired = 0 AND expires_at < ?
  `).run(now);

  // 2. Staleness: unused for 3+ months → halve confidence
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  db.prepare(`
    UPDATE intel_signals
    SET confidence = confidence * 0.5
    WHERE is_expired = 0
      AND times_applied = 0
      AND created_at < ?
      AND (last_reinforced IS NULL OR last_reinforced < ?)
  `).run(threeMonthsAgo.toISOString(), threeMonthsAgo.toISOString());

  // 3. Auto-expire anything that dropped below 0.3
  db.prepare(`
    UPDATE intel_signals
    SET is_expired = 1
    WHERE is_expired = 0 AND confidence < 0.3
  `).run();

  return hardExpired.changes;
}

// ─── Scout Run Logging ───────────────────────────────────────────────────────

export function logScoutRun({ sourcesChecked, signalsFound, signalsExpired, signalsDeduplicated }) {
  const db = getMemoryDb();
  db.prepare(`
    INSERT INTO scout_runs (sources_checked, signals_found, signals_expired, signals_deduplicated)
    VALUES (?, ?, ?, ?)
  `).run(JSON.stringify(sourcesChecked), signalsFound, signalsExpired, signalsDeduplicated);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function getMemoryDashboard() {
  const db = getMemoryDb();
  const total = db.prepare("SELECT COUNT(*) as c FROM intel_signals").get().c;
  const active = db.prepare("SELECT COUNT(*) as c FROM intel_signals WHERE is_expired = 0 AND confidence >= 0.5").get().c;
  const expired = db.prepare("SELECT COUNT(*) as c FROM intel_signals WHERE is_expired = 1").get().c;
  const lowConf = db.prepare("SELECT COUNT(*) as c FROM intel_signals WHERE is_expired = 0 AND confidence < 0.5").get().c;
  const lastRun = db.prepare("SELECT ran_at FROM scout_runs ORDER BY ran_at DESC LIMIT 1").get();
  const bySource = db.prepare(`
    SELECT source, COUNT(*) as count, AVG(confidence) as avg_confidence
    FROM intel_signals WHERE is_expired = 0
    GROUP BY source
  `).all();

  return { total, active, expired, lowConf, lastRun: lastRun?.ran_at || "never", bySource };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  if (cmd === "dashboard") {
    const d = getMemoryDashboard();
    console.log("\n=== SEO Memory Dashboard ===");
    console.log(`Total signals:     ${d.total}`);
    console.log(`Active (≥0.5):     ${d.active}`);
    console.log(`Low confidence:    ${d.lowConf}`);
    console.log(`Expired:           ${d.expired}`);
    console.log(`Last scout run:    ${d.lastRun}`);
    console.log("\nBy source:");
    console.table(d.bySource);
  } else if (cmd === "active") {
    const signals = getActiveSignals(0.5);
    console.log(`\n${signals.length} active signals:\n`);
    for (const s of signals) {
      console.log(`  [${(s.confidence * 100).toFixed(0)}%] (${s.source}) ${s.signal_text}`);
    }
  } else if (cmd === "expire") {
    const count = expireStaleSignals();
    console.log(`Expired ${count} stale signals.`);
  } else {
    console.log("Usage: node scripts/seo_memory.mjs <dashboard|active|expire>");
  }
}
