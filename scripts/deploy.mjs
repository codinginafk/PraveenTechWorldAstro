/**
 * deploy.mjs — build, stage, commit and push in one guarded step.
 *
 * Replaces the old single-line `deploy` npm script, which:
 *   - staged a hand-maintained allow-list. Adding a file under src/data/,
 *     src/lib/ (except seo/metadata.ts), src/content/authors/ or
 *     src/content/tags/ silently shipped a tree that failed on Vercel with
 *     MODULE_NOT_FOUND, because the referenced file was never committed.
 *   - ran `git commit` unconditionally, so a run with nothing to stage exited 1
 *     *after* a successful build and looked like a deploy failure.
 *   - still listed public/_redirects, which no longer exists.
 *
 * Now staging is `git add -A` (the .gitignore is the single source of what may
 * be committed) and the commit is skipped when nothing changed.
 *
 * Usage: npm run deploy            (build + commit + push)
 *        npm run deploy -- --no-build
 */
import { execFileSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const skipBuild = process.argv.includes('--no-build');

const run = (cmd, args, opts = {}) => {
  execFileSync(cmd, args, { stdio: 'inherit', ...opts });
};
const capture = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();

if (!skipBuild) {
  console.log('\n▶ building');
  run(isWindows ? 'npm.cmd' : 'npm', ['run', 'build']);
}

console.log('\n▶ staging');
run('git', ['add', '-A']);

const staged = capture('git', ['diff', '--cached', '--name-only']);
if (!staged) {
  console.log('nothing to commit — working tree already matches HEAD');
  process.exit(0);
}

const files = staged.split('\n');
console.log(`  ${files.length} file(s):`);
files.slice(0, 25).forEach((f) => console.log(`    ${f}`));
if (files.length > 25) console.log(`    … and ${files.length - 25} more`);

console.log('\n▶ committing');
run('git', ['commit', '-m', 'publish: deploy articles and assets [auto]']);

console.log('\n▶ pushing to origin/main');
run('git', ['push', 'origin', 'main']);

console.log('\ndone. CI will run the preflight audit + full build on the pushed commit.');
