#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const MEMORY_DIR = path.join(ROOT, "docs", "project-memory");
const CURRENT_PATH = path.join(MEMORY_DIR, "current.json");
const EVENTS_PATH = path.join(MEMORY_DIR, "events.jsonl");

function readCurrent() {
  return JSON.parse(fs.readFileSync(CURRENT_PATH, "utf8"));
}

function valueAfter(args, flag, fallback = "") {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function listAfter(args, flag) {
  return valueAfter(args, flag)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function now() {
  return new Date().toISOString();
}

function writeCurrent(current) {
  current.updatedAt = now();
  fs.writeFileSync(CURRENT_PATH, `${JSON.stringify(current, null, 2)}\n`, "utf8");
}

function appendEvent(event) {
  fs.appendFileSync(EVENTS_PATH, `${JSON.stringify({ timestamp: now(), ...event })}\n`, "utf8");
}

function printStatus() {
  const current = readCurrent();
  console.log(JSON.stringify(current, null, 2));
}

function record(type, args) {
  const current = readCurrent();
  const summary = valueAfter(args, "--summary");
  if (!summary) throw new Error("--summary is required");

  const event = {
    type,
    actor: valueAfter(args, "--actor", "unknown"),
    harness: valueAfter(args, "--harness", "unknown"),
    model: valueAfter(args, "--model", "not-recorded"),
    summary,
    reason: valueAfter(args, "--reason"),
    status: valueAfter(args, "--status", type === "decision" ? "recorded" : "paused"),
    files: listAfter(args, "--files"),
    next: listAfter(args, "--next"),
    approvalRequired: valueAfter(args, "--approval", "true") !== "false",
  };

  appendEvent(event);
  current.lastHandoff = event;
  current.activeWork = {
    summary,
    status: event.status,
    nextAction: event.next[0] || "Review the latest handoff and continue from the listed files.",
    approvalRequired: event.approvalRequired,
  };
  writeCurrent(current);
  console.log(`Recorded ${type} event at ${CURRENT_PATH}`);
}

const [command, ...args] = process.argv.slice(2);
try {
  if (command === "status") printStatus();
  else if (command === "handoff" || command === "decision") record(command, args);
  else {
    console.error("Usage: node scripts/project-memory.mjs status|handoff|decision [options]");
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
