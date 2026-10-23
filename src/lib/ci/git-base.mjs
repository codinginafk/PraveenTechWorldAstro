/**
 * git-base.mjs — one place that answers "what am I diffing against?".
 *
 * On a GitHub Actions checkout of a push to `main`, `origin/main` and `HEAD` are
 * the same commit. Any `git diff origin/main...HEAD` therefore returns nothing,
 * which silently turned two blocking CI gates into no-ops:
 *
 *   - the Slop-Gate reported "no article changes detected — skipped"
 *   - the Single-Post Release Guard reported PASSED without examining anything
 *
 * Both now resolve their base through this module. Order of preference:
 *
 *   1. GITHUB_BEFORE_SHA — the commit the push actually replaced. Exact for
 *      push events. Ignored when it is all zeroes (new branch / first push).
 *   2. origin/${GITHUB_BASE_REF} — the target of a pull request.
 *   3. origin/main, when it exists and is not HEAD.
 *   4. HEAD~1 — local run after a commit.
 *   5. null — nothing to compare against; callers must say so out loud.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ZERO_SHA = /^0{40}$/;

/**
 * Run git and return stdout.
 *
 * `trimStart` must stay false for porcelain output: a worktree-only change is
 * reported as " M path" — a leading space that is part of the format. Trimming
 * the whole blob deletes it from the first line only, shifting `slice(3)` by one
 * character so the first changed file is silently dropped.
 */
function git(args, cwd, { trimStart = true } = {}) {
  try {
    const out = execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return trimStart ? out.trim() : out.replace(/\s+$/, "");
  } catch {
    return "";
  }
}

function commitExists(ref, cwd) {
  return git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], cwd) !== "";
}

/**
 * @returns {{ ref: string, kind: string, reason: string } | null}
 */
export function resolveDiffBase(cwd = process.cwd()) {
  const before = (process.env.GITHUB_BEFORE_SHA || "").trim();
  if (before && !ZERO_SHA.test(before) && commitExists(before, cwd)) {
    return { ref: before, kind: "push-before", reason: `github.event.before (${before.slice(0, 7)})` };
  }

  const baseRef = (process.env.GITHUB_BASE_REF || "").trim();
  if (baseRef && commitExists(`origin/${baseRef}`, cwd)) {
    return { ref: `origin/${baseRef}`, kind: "pr-base", reason: `pull request base origin/${baseRef}` };
  }

  if (commitExists("origin/main", cwd)) {
    const head = git(["rev-parse", "HEAD"], cwd);
    const origin = git(["rev-parse", "origin/main"], cwd);
    if (origin && origin !== head) {
      return { ref: "origin/main", kind: "origin-main", reason: "origin/main is behind HEAD" };
    }
  }

  if (commitExists("HEAD~1", cwd)) {
    return { ref: "HEAD~1", kind: "head-parent", reason: "origin/main matches HEAD, fell back to HEAD~1" };
  }

  return null;
}

/**
 * Files changed between the resolved base and the working tree, limited to the
 * given pathspecs. Includes uncommitted worktree changes so the same function
 * is useful locally before a commit.
 *
 * @returns {{ base: ReturnType<typeof resolveDiffBase>, files: string[] }}
 */
export function changedFiles({ paths = [], cwd = process.cwd() } = {}) {
  const base = resolveDiffBase(cwd);
  const files = new Set();

  if (base) {
    const args = ["diff", "--name-only", `${base.ref}..HEAD`];
    if (paths.length) args.push("--", ...paths);
    for (const line of git(args, cwd).split("\n")) {
      const file = line.trim();
      if (file) files.add(file);
    }
  }

  // Uncommitted worktree edits, so local runs still see what is about to ship.
  const statusArgs = ["status", "--porcelain"];
  if (paths.length) statusArgs.push("--", ...paths);
  for (const line of git(statusArgs, cwd, { trimStart: false }).split(/\r?\n/)) {
    // "XY path" — two status columns, one separating space, then the path.
    if (line.length < 4) continue;
    const file = line.slice(3).trim().replace(/^"|"$/g, "");
    if (!file) continue;
    if (fs.existsSync(path.join(cwd, file))) files.add(file);
  }

  return { base, files: [...files] };
}

/** Blob content of `file` at `ref`, or null when the file is new at that ref. */
export function fileAtRef(file, ref, cwd = process.cwd()) {
  if (!ref) return null;
  try {
    return execFileSync("git", ["show", `${ref}:${file}`], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}
