import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { createCipheriv, scryptSync, randomBytes } from "node:crypto";
import dotenv from "dotenv";

const userHome = os.homedir();
const envPath = path.join(userHome, ".omniroute", ".env");
const dbPath = path.join(userHome, ".omniroute", "storage.sqlite");

// Load local .env first for API keys
dotenv.config();

// Load storage encryption key
dotenv.config({ path: envPath, override: true });
const secret = process.env.STORAGE_ENCRYPTION_KEY;
if (!secret) {
  throw new Error("STORAGE_ENCRYPTION_KEY not found in .omniroute/.env");
}

console.log(`Loaded STORAGE_ENCRYPTION_KEY: ${secret.slice(0, 8)}...`);

// Constants
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "enc:v1:";
const STATIC_SALT = "omniroute-field-encryption-v1";

// Derive key
const key = scryptSync(secret, STATIC_SALT, KEY_LENGTH);

function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== "string") return plaintext;
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${PREFIX}${iv.toString("hex")}:${encrypted}:${authTag}`;
}

const db = new Database(dbPath);

console.log("Cleaning old provider connections and API keys...");
db.prepare("DELETE FROM provider_connections").run();
db.prepare("DELETE FROM api_keys").run();

// Seed connections
const insertConn = db.prepare(`
  INSERT INTO provider_connections (id, provider, auth_type, name, is_active, api_key, test_status, created_at, updated_at)
  VALUES (?, ?, 'api_key', ?, 1, ?, 'verified', datetime('now'), datetime('now'))
`);

const orKey = process.env.OPENROUTER_API_KEY || "";
const geminiKey = process.env.GEMINI_API_KEY || "";

const encryptedOrKey = encrypt(orKey);
const encryptedGeminiKey = encrypt(geminiKey);

console.log(`Encrypted OR Key prefix: ${encryptedOrKey.slice(0, 20)}...`);
console.log(`Encrypted Gemini Key prefix: ${encryptedGeminiKey.slice(0, 20)}...`);

insertConn.run("conn-openrouter", "openrouter", "OpenRouter Main Key", encryptedOrKey);
console.log("Seeded encrypted provider: openrouter");

insertConn.run("conn-google", "google", "Google Gemini Key", encryptedGeminiKey);
console.log("Seeded encrypted provider: google");

insertConn.run("conn-gemini", "gemini", "Google Gemini Alias", encryptedGeminiKey);
console.log("Seeded encrypted provider: gemini");

// Seed FSM API key
db.prepare(`
  INSERT INTO api_keys (name, key, allowed_models, created_at)
  VALUES ('Antigravity FSM Key', 'omniroute-resilience-key', '*', datetime('now'))
`).run();
console.log("Seeded API key: omniroute-resilience-key");

console.log("OmniRoute seeding with encrypted credentials completed successfully!");
