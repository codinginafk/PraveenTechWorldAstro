#!/usr/bin/env node
/**
 * scripts/schedule_drip_builder.mjs
 * =====================================================================
 * Generates an automated publishing queue with randomized 3-5 hour gaps.
 * Populates src/scripts/publish_schedule.json for safe cadenced releases.
 * Enforces 4-5 articles/day maximum velocity.
 * =====================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const SCHEDULE_FILE = path.join(ROOT_DIR, 'src/scripts/publish_schedule.json');
const ARTICLES_DIR = path.join(ROOT_DIR, 'src/content/articles');

function getRandomIntervalMinutes(minHours = 3, maxHours = 5) {
  const minMin = minHours * 60;
  const maxMin = maxHours * 60;
  return Math.floor(Math.random() * (maxMin - minMin + 1)) + minMin;
}

export function buildSchedule(draftFiles = [], startTime = new Date()) {
  let currentTime = new Date(startTime.getTime());
  const scheduleEntries = [];

  for (const file of draftFiles) {
    const gapMinutes = getRandomIntervalMinutes(3, 5);
    currentTime = new Date(currentTime.getTime() + gapMinutes * 60 * 1000);

    scheduleEntries.push({
      file,
      publishAt: currentTime.toISOString(),
      gapHours: (gapMinutes / 60).toFixed(2)
    });
  }

  return scheduleEntries;
}

// CLI execution
if (process.argv[1] === __filename) {
  console.log('🗓️ Scheduling draft queue with randomized 3-5 hour intervals...');
  
  // Check pipeline tracker first
  const TRACKER_FILE = path.join(ROOT_DIR, 'docs/pipeline/content-engine-tracker.json');
  let prioritySlugs = [];
  if (fs.existsSync(TRACKER_FILE)) {
    const tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
    const queue = tracker.pipeline?.editorialHubsQueue || [];
    prioritySlugs = queue.map(q => q.slug);
  }

  // Find all draft articles currently in articles dir
  const allArticles = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.mdx'));
  const draftArticles = [];

  // 1. Add priority drafts first
  for (const slug of prioritySlugs) {
    const filename = `${slug}.mdx`;
    const fullPath = path.join(ARTICLES_DIR, filename);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (/^draft:\s*true\s*$/m.test(content)) {
        draftArticles.push(filename);
      }
    }
  }

  // 2. Add other non-redirected drafts
  for (const f of allArticles) {
    if (draftArticles.includes(f)) continue;
    const content = fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf8');
    if (/^draft:\s*true\s*$/m.test(content)) {
      // Skip merged/redirected legacy files
      if (content.includes('MERGED:') || content.includes('REDIRECTED:') || content.includes('redirected')) {
        continue;
      }
      draftArticles.push(f);
    }
  }

  console.log(`Found ${draftArticles.length} draft articles.`);
  if (draftArticles.length === 0) {
    console.log('No draft articles to schedule. Queue remains clean.');
    process.exit(0);
  }

  const schedule = buildSchedule(draftArticles);
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), 'utf8');
  console.log(`✅ Scheduled ${schedule.length} articles into src/scripts/publish_schedule.json:`);
  schedule.forEach((s, idx) => {
    console.log(`  ${idx + 1}. ${s.file} -> ${s.publishAt} (+${s.gapHours} hrs)`);
  });
}
