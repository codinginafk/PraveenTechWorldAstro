#!/usr/bin/env node
/**
 * scripts/seo_rl_ledger.mjs
 * Autonomous SEO Reinforcement Learning (RL) & Regression Guard Ledger.
 * Tracks optimization actions, enforces 14-day observation cooldowns,
 * calculates reward signals, and detects search performance regressions.
 */

import fs from 'fs/promises';
import path from 'path';

const ROOT_DIR = process.cwd();
const LEDGER_FILE = path.join(ROOT_DIR, 'research', 'seo_rl_ledger.jsonl');
const REPORT_FILE = path.join(ROOT_DIR, 'research', 'reports', 'seo_rl_performance_report.md');

// 14-Day Observation Window in Milliseconds
const COOLDOWN_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function readLedger() {
  try {
    const raw = await fs.readFile(LEDGER_FILE, 'utf-8');
    return raw
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => JSON.parse(line));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function writeLedger(records) {
  const content = records.map(r => JSON.stringify(r)).join('\n') + '\n';
  await fs.mkdir(path.dirname(LEDGER_FILE), { recursive: true });
  await fs.writeFile(LEDGER_FILE, content, 'utf-8');
}

function computeReward(baseline, current) {
  const dClicks = current.clicks - baseline.clicks;
  const dImpr = current.impressions - baseline.impressions;
  const dPos = current.position - baseline.position; // Positive means position worsened (e.g. 8 -> 12)

  // Reward Function: Clicks are weighted 5x, Impressions 0.05x, Position drops penalized heavily (-2x)
  const reward = (dClicks * 5.0) + (dImpr * 0.05) - (dPos * 2.0);
  return {
    reward: parseFloat(reward.toFixed(2)),
    dClicks,
    dImpr,
    dPos: parseFloat(dPos.toFixed(2)),
    isRegression: dPos > 3.0 || (baseline.impressions > 200 && dImpr < -(baseline.impressions * 0.25))
  };
}

async function logAction(args) {
  const article = args.article;
  const action = args.action || 'CONTENT_ELEVATION';
  const targetQuery = args['target-query'] || '';
  const commit = args.commit || 'HEAD';
  const hypothesis = args.hypothesis || 'Systematic elevation to 110/110 score';

  const baseline = {
    impressions: parseInt(args.impressions || '0', 10),
    clicks: parseInt(args.clicks || '0', 10),
    ctr: parseFloat(args.ctr || '0'),
    position: parseFloat(args.position || '0')
  };

  const now = new Date();
  const evalDueDate = new Date(now.getTime() + COOLDOWN_DAYS * MS_PER_DAY);

  const entry = {
    id: `RL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    timestamp: now.toISOString(),
    article,
    action,
    target_query: targetQuery,
    commit,
    hypothesis,
    baseline,
    status: 'OBSERVING', // OBSERVING | EVALUATED | REGRESSED | ROLLED_BACK
    eval_due_date: evalDueDate.toISOString(),
    evaluation: null
  };

  const records = await readLedger();
  records.push(entry);
  await writeLedger(records);

  console.log(`\n✅ [SEO RL LEDGER] Action successfully recorded: ${entry.id}`);
  console.log(`• Article:     ${article}`);
  console.log(`• Action:      ${action}`);
  console.log(`• Target Query:${targetQuery}`);
  console.log(`• Baseline:    ${baseline.impressions} impr | ${baseline.clicks} clicks | pos ${baseline.position}`);
  console.log(`• Eval Date:   ${evalDueDate.toISOString().split('T')[0]} (14-day observation window active)\n`);
}

async function showStatus() {
  const records = await readLedger();
  console.log(`\n========================================================================`);
  console.log(`📊 PRAVEENTECHWORLD SEO REINFORCEMENT LEARNING LEDGER STATUS`);
  console.log(`========================================================================`);
  console.log(`Total Tracked Optimization Epochs: ${records.length}\n`);

  if (records.length === 0) {
    console.log(`No records logged in ${LEDGER_FILE} yet.\n`);
    return;
  }

  const now = new Date();
  let activeObserving = 0;
  let evaluated = 0;
  let regressions = 0;

  console.log(
    `${'Epoch ID'.padEnd(16)} | ${'Status'.padEnd(10)} | ${'Action'.padEnd(24)} | ${'Due In'.padEnd(10)} | Article`
  );
  console.log('-'.repeat(95));

  for (const r of records) {
    const dueDate = new Date(r.eval_due_date);
    const msRemaining = dueDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / MS_PER_DAY));

    let dueStr = `${daysRemaining} days`;
    if (r.status === 'OBSERVING') {
      activeObserving++;
      if (msRemaining <= 0) dueStr = 'READY NOW';
    } else if (r.status === 'EVALUATED') {
      evaluated++;
      dueStr = 'DONE';
    } else if (r.status === 'REGRESSED') {
      regressions++;
      dueStr = 'ALERT ⚠️';
    }

    console.log(
      `${r.id.padEnd(16)} | ${r.status.padEnd(10)} | ${r.action.padEnd(24)} | ${dueStr.padEnd(10)} | ${r.article}`
    );
  }

  console.log('-'.repeat(95));
  console.log(`Observing Cooldown: ${activeObserving} | Evaluated: ${evaluated} | Regressions: ${regressions}\n`);
}

async function evaluateRecord(id, current) {
  const records = await readLedger();
  const index = records.findIndex(r => r.id === id || r.article === id);

  if (index === -1) {
    console.error(`❌ Record with ID/Article "${id}" not found in ledger.`);
    return;
  }

  const record = records[index];
  const evalResult = computeReward(record.baseline, current);

  record.evaluation = {
    evaluated_at: new Date().toISOString(),
    metrics: current,
    ...evalResult
  };

  record.status = evalResult.isRegression ? 'REGRESSED' : 'EVALUATED';
  records[index] = record;
  await writeLedger(records);

  console.log(`\n========================================================================`);
  console.log(`🎯 EVALUATION COMPLETE: ${record.article}`);
  console.log(`========================================================================`);
  console.log(`• Baseline:    ${record.baseline.impressions} impr | ${record.baseline.clicks} clicks | pos ${record.baseline.position}`);
  console.log(`• Current:     ${current.impressions} impr | ${current.clicks} clicks | pos ${current.position}`);
  console.log(`• Delta:       ${evalResult.dImpr > 0 ? '+' : ''}${evalResult.dImpr} impr | ${evalResult.dClicks > 0 ? '+' : ''}${evalResult.dClicks} clicks | ${evalResult.dPos > 0 ? '+' : ''}${evalResult.dPos} pos`);
  console.log(`• Reward (R):  ${evalResult.reward}`);
  console.log(`• Status:      ${record.status}`);

  if (evalResult.isRegression) {
    console.log(`⚠️ REGRESSION DETECTED! Position dropped by >3.0 or impressions plummeted.`);
    console.log(`Recommended Policy: Roll back title / frontmatter via git to commit ${record.commit}.\n`);
  } else {
    console.log(`✅ POSITIVE REINFORCEMENT SIGNAL: Action was effective!\n`);
  }
}

// Parse Command-Line Arguments
function parseArgs(args) {
  const parsed = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = true;
      }
    } else {
      parsed._.push(arg);
    }
  }
  return parsed;
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const command = parsed._[0] || 'status';

  if (command === 'status') {
    await showStatus();
  } else if (command === 'log') {
    await logAction(parsed);
  } else if (command === 'eval' || command === 'evaluate') {
    const id = parsed._[1] || parsed.id || parsed.article;
    if (!id) {
      console.error('Usage: node scripts/seo_rl_ledger.mjs evaluate <id|article> --impressions <n> --clicks <n> --position <n>');
      process.exit(1);
    }
    const current = {
      impressions: parseInt(parsed.impressions || '0', 10),
      clicks: parseInt(parsed.clicks || '0', 10),
      ctr: parseFloat(parsed.ctr || '0'),
      position: parseFloat(parsed.position || '0')
    };
    await evaluateRecord(id, current);
  } else {
    console.log(`Unknown command: ${command}`);
    console.log(`Available commands: status, log, evaluate`);
  }
}

main().catch(err => {
  console.error('Fatal Ledger Error:', err);
  process.exit(1);
});
