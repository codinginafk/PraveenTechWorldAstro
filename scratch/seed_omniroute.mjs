import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

import dotenv from "dotenv";
dotenv.config();

const dbPath = path.join(os.homedir(), ".omniroute", "storage.sqlite");
const db = new Database(dbPath);

console.log("Seeding OmniRoute database...");

// Clear existing tables to avoid duplicate key violations if any exists
db.prepare("DELETE FROM provider_connections").run();
db.prepare("DELETE FROM api_keys").run();

// 1. Seed provider connections
const insertConn = db.prepare(`
  INSERT INTO provider_connections (provider, auth_type, name, is_active, api_key, created_at, updated_at)
  VALUES (?, 'api_key', ?, 1, ?, datetime('now'), datetime('now'))
`);

// Add OpenRouter key
insertConn.run("openrouter", "OpenRouter Main Key", process.env.OPENROUTER_API_KEY || "");
console.log("Seeded provider: openrouter");

// Add Google key (standard id: google)
insertConn.run("google", "Google Gemini Key", process.env.GEMINI_API_KEY || "");
console.log("Seeded provider: google");

// Add Gemini alias just in case
insertConn.run("gemini", "Google Gemini Alias", process.env.GEMINI_API_KEY || "");
console.log("Seeded provider: gemini");

// 2. Seed FSM API key
db.prepare(`
  INSERT INTO api_keys (name, key, allowed_models, created_at)
  VALUES ('Antigravity FSM Key', 'omniroute-resilience-key', '*', datetime('now'))
`).run();
console.log("Seeded API key: omniroute-resilience-key");

console.log("OmniRoute seeding completed successfully!");
