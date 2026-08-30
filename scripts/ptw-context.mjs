#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const defaultControlRoot = path.resolve(projectRoot, "..", "PTW_Local_Control_System_v2");

function valueAfter(args, flag, fallback = "") {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
  });
  return {
    ok: result.status === 0,
    code: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function controlContext(controlRoot, agent, task) {
  if (!controlRoot) {
    return {
      status: "not-configured",
      message: "Set PTW_CONTROL_ROOT to the external PTW Local Control System v2 directory.",
    };
  }

  const root = path.resolve(controlRoot);
  const cli = path.join(root, "ptw.py");
  if (!fs.existsSync(cli)) {
    return { status: "invalid", root, message: `PTW CLI not found at ${cli}` };
  }

  const python = process.env.PTW_PYTHON || "python";
  const args = [cli, "context"];
  if (agent) args.push("--agent", agent);
  if (task) args.push("--task", task);
  const result = run(python, args, root);
  if (!result.ok) {
    return {
      status: "error",
      root,
      command: [python, ...args].join(" "),
      message: result.stderr || result.stdout || `PTW exited with code ${result.code}`,
    };
  }

  try {
    return { status: "ok", root, data: JSON.parse(result.stdout) };
  } catch {
    return { status: "error", root, message: "PTW returned non-JSON context output.", output: result.stdout.slice(0, 2000) };
  }
}

function repositoryContext() {
  const memory = readJson(path.join(projectRoot, "docs", "project-memory", "current.json"), null);
  const state = readJson(path.join(projectRoot, "research", "agents", "state.json"), null);
  const git = run("git", ["status", "--short", "--branch"], projectRoot);
  return {
    projectMemory: memory,
    contentPipeline: state
      ? {
          sprint: state.sprint,
          currentCluster: state.currentCluster,
          articlesPublishedToday: state.articlesPublishedToday,
          lastPublishDate: state.lastPublishDate,
          lastGscCheck: state.lastGscCheck,
          lastAnalyticsRun: state.lastAnalyticsRun,
          contentIntelligence: state.contentIntelligence,
        }
      : null,
    git: { ok: git.ok, status: git.stdout, error: git.stderr || null },
  };
}

const args = process.argv.slice(2);
const agent = valueAfter(args, "--agent", process.env.PTW_AGENT || "");
const task = valueAfter(args, "--task", process.env.PTW_TASK || "");
const controlRoot = valueAfter(
  args,
  "--control-root",
  process.env.PTW_CONTROL_ROOT || (fs.existsSync(defaultControlRoot) ? defaultControlRoot : ""),
);
const output = {
  generatedAt: new Date().toISOString(),
  project: "PraveenTechWorld",
  projectRoot,
  agent: agent || null,
  task: task || null,
  authority: {
    repository: "code, content, docs, and Git history",
    projectMemory: "cross-harness handoff and decisions",
    contentPipeline: "research/agents/state.json",
    ptw: "task ownership, agent isolation, submissions, approvals, recovery, and audit events",
  },
  policy: { singlePostRelease: true, scheduledJobsAreReadOnly: true, growthOsMode: "OFF until its documented activation gates pass" },
  repository: repositoryContext(),
  control: controlContext(controlRoot, agent, task),
};

if (args.includes("--require-control") && output.control.status !== "ok") {
  console.error(JSON.stringify(output, null, 2));
  process.exit(2);
}

console.log(JSON.stringify(output, null, 2));
