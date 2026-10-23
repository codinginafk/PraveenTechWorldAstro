import { insertSignal, getActiveSignals } from './scripts/seo_memory.mjs';

insertSignal({
  source: 'reddit_r_seo',
  text: 'Google heavily penalizes programmatic SEO if it lacks unique value.',
  category: 'penalty',
  confidence: 0.85
});

insertSignal({
  source: 'google_search_central',
  text: 'Focus on first-hand experience (the E in E-E-A-T). Use words like "In my experience" or "When I tested this".',
  category: 'e_e_a_t',
  confidence: 0.95
});

insertSignal({
  source: 'search_engine_roundtable',
  text: 'Recent core update severely impacted expired domains repurposed as affiliate sites.',
  category: 'algorithm_update',
  confidence: 0.8
});

console.log(getActiveSignals(0.5));
