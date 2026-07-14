#!/usr/bin/env node
/**
 * scripts/seo_intel_scout.mjs
 * ---------------------------------------------------------------------------
 * SEO Intelligence Scout — scans Reddit, Google Search Central, Search Engine
 * Roundtable, and Hacker News for actionable SEO signals. Extracts structured
 * insights via LLM, deduplicates, scores confidence, and stores in seo_memory.
 *
 * Sources (all free, no API keys needed):
 *   - Reddit r/SEO:           old.reddit.com/r/SEO/search.json
 *   - Reddit r/bigseo:        old.reddit.com/r/bigseo/search.json
 *   - Google Search Central:  developers.google.com/search/blog RSS
 *   - Search Engine Roundtable: seroundtable.com RSS
 *   - Hacker News:            hn.algolia.com/api/v1/search
 *
 * Usage:
 *   node scripts/seo_intel_scout.mjs scan          # full scan all sources
 *   node scripts/seo_intel_scout.mjs scan --dry-run # preview without saving
 *   node scripts/seo_intel_scout.mjs dashboard      # show memory status
 */

import "dotenv/config";
import { insertSignal, logScoutRun, getMemoryDashboard, expireStaleSignals } from "./seo_memory.mjs";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-pro-preview";
const OPENROUTER_MODEL = "poolside/laguna-m.1:free";

async function callOpenRouterAPI(systemPrompt, userPrompt, maxTokens) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callLLM(systemPrompt, userPrompt, maxTokens = 800) {
  // Try OmniRoute first for absolute resilience and load balancing
  const OMNIROUTE_URL = process.env.OMNIROUTE_URL || "http://localhost:20128/v1/chat/completions";
  try {
    const omniRes = await fetch(OMNIROUTE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer omniroute-resilience-key"
      },
      body: JSON.stringify({
        model: GEMINI_API_KEY ? GEMINI_MODEL : OPENROUTER_MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (omniRes.ok) {
      const data = await omniRes.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      console.log(`[OmniRoute] SEO Scout request successfully routed through local gateway.`);
      return text;
    }
  } catch (err) {
    // Fail silently, fall back to direct providers
  }

  // Fallback to direct APIs
  if (GEMINI_API_KEY) {
    try {
      // Native Gemini API
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (e) {
      if (OPENROUTER_API_KEY) {
        console.warn(`[SEOScout] Gemini API failed (${e.message}). Falling back to OpenRouter...`);
        return callOpenRouterAPI(systemPrompt, userPrompt, maxTokens);
      }
      throw e;
    }
  } else if (OPENROUTER_API_KEY) {
    return callOpenRouterAPI(systemPrompt, userPrompt, maxTokens);
  } else {
    throw new Error("[SEOScout] No API key found. Add GEMINI_API_KEY or OPENROUTER_API_KEY to .env");
  }
}

// ─── Source: Reddit ──────────────────────────────────────────────────────────

async function scrapeReddit(subreddit, limit = 15) {
  const sourceName = `reddit_r_${subreddit}`;
  console.log(`[SEOScout] Scanning r/${subreddit}...`);

  // Use the listing endpoint (not search) — search endpoint returns 403 without OAuth
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[SEOScout] Reddit r/${subreddit} returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    const posts = data?.data?.children || [];

    return posts.map((p) => ({
      source: sourceName,
      url: `https://reddit.com${p.data.permalink}`,
      title: p.data.title,
      body: (p.data.selftext || "").slice(0, 1500),
      score: p.data.score,
      created: new Date(p.data.created_utc * 1000).toISOString(),
    }));
  } catch (err) {
    console.warn(`[SEOScout] Reddit r/${subreddit} fetch failed: ${err.message}`);
    return [];
  }
}

// ─── Source: RSS Feeds (Google Search Central, Search Engine Roundtable) ─────

async function scrapeRSS(feedUrl, sourceName, maxItems = 10) {
  console.log(`[SEOScout] Scanning ${sourceName}...`);

  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "PraveenTechWorld-SEOScout/1.0" },
    });
    if (!res.ok) {
      console.warn(`[SEOScout] ${sourceName} returned ${res.status}`);
      return [];
    }
    const xml = await res.text();

    // Simple XML parsing (no dependency needed for RSS items)
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) && items.length < maxItems) {
      const itemXml = match[1];
      const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] || itemXml.match(/<title>(.*?)<\/title>/)?.[1] || "";
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || "";
      const desc = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>|<description>([\s\S]*?)<\/description>/)?.[1] || "";
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

      items.push({
        source: sourceName,
        url: link.trim(),
        title: title.trim().replace(/<[^>]*>/g, ""),
        body: desc.trim().replace(/<[^>]*>/g, "").slice(0, 1500),
        created: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      });
    }

    // Also try Atom <entry> format
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) && items.length < maxItems) {
      const entryXml = match[1];
      const title = entryXml.match(/<title[^>]*>(.*?)<\/title>/)?.[1] || "";
      const link = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*\/>/)?.[1] || "";
      const content = entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] || "";
      const published = entryXml.match(/<published>(.*?)<\/published>/)?.[1] || "";

      items.push({
        source: sourceName,
        url: link.trim(),
        title: title.trim().replace(/<[^>]*>/g, ""),
        body: content.trim().replace(/<[^>]*>/g, "").slice(0, 1500),
        created: published ? new Date(published).toISOString() : new Date().toISOString(),
      });
    }

    return items;
  } catch (err) {
    console.warn(`[SEOScout] ${sourceName} fetch failed: ${err.message}`);
    return [];
  }
}

// ─── Source: Hacker News ─────────────────────────────────────────────────────

async function scrapeHN(query = "google seo algorithm update", limit = 10) {
  console.log(`[SEOScout] Scanning Hacker News...`);

  try {
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[SEOScout] HN returned ${res.status}`);
      return [];
    }
    const data = await res.json();

    return (data.hits || []).map((h) => ({
      source: "hackernews",
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      title: h.title || "",
      body: (h.story_text || "").slice(0, 1500),
      score: h.points || 0,
      created: h.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn(`[SEOScout] HN fetch failed: ${err.message}`);
    return [];
  }
}

// ─── LLM Signal Extraction ──────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are an SEO intelligence analyst. Given forum posts or blog articles about SEO, extract actionable signals that a content creator should know about.

For each signal, determine:
1. signal_text: A concise, actionable insight (1-2 sentences max)
2. confidence: Rate 0.0 to 1.0 based on:
   - Official Google source → 0.9+
   - Corroborated by multiple independent reports → 0.7-0.8
   - Single credible anecdotal report → 0.4-0.6
   - Speculation or rumor → 0.1-0.3
3. category: One of: algorithm_update, penalty, ranking_factor, content_quality, technical_seo, e_e_a_t, ai_content, link_building, schema_markup

Return ONLY a valid JSON object: {"signals": [{"signal_text": "...", "confidence": 0.X, "category": "..."}]}
If no actionable signals are found, return: {"signals": []}
Do not include markdown formatting or backticks around the JSON.`;

async function extractSignals(items) {
  if (items.length === 0) return [];

  const allSignals = [];
  const batchSize = 5;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Construct user prompt for the batch
    let batchText = "";
    batch.forEach((item, index) => {
      const body = item.body ? `\nBody: ${item.body.slice(0, 400)}` : "";
      batchText += `--- ITEM ${index + 1} ---\nSource: ${item.source}\nTitle: ${item.title}${body}\nURL: ${item.url}\n\n`;
    });

    const userPrompt = `Analyze these ${batch.length} posts and extract actionable SEO signals:\n\n${batchText}`;

    // Respect rate limits by adding a delay between batches
    if (i > 0) {
      await new Promise(r => setTimeout(r, 6000));
    }

    try {
      const raw = await callLLM(EXTRACTION_SYSTEM_PROMPT, userPrompt, 1000);
      const cleaned = raw.replace(/^```json\s*|```\s*$/gm, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // Try fixing truncated JSON
        let fixAttempt = cleaned;
        if (!fixAttempt.endsWith("}")) fixAttempt += '"]}'; 
        if (!fixAttempt.endsWith("]")) fixAttempt += ']}';
        try {
          parsed = JSON.parse(fixAttempt);
        } catch {
          console.warn(`[SEOScout] JSON parsing failed for batch starting at index ${i}`);
          continue; 
        }
      }

      if (!Array.isArray(parsed.signals)) continue;

      for (const s of parsed.signals) {
        if (!s.signal_text && !s.text) continue;
        
        // Find matching item in batch to preserve metadata (or fallback)
        let matchedItem = batch[0];
        const textLower = (s.signal_text || s.text || "").toLowerCase();
        for (const item of batch) {
          if (textLower.includes(item.title.toLowerCase().split(" ").slice(0, 2).join(" "))) {
            matchedItem = item;
            break;
          }
        }

        allSignals.push({
          text: s.signal_text || s.text || "",
          confidence: Math.min(1.0, Math.max(0.0, Number(s.confidence) || 0.5)),
          category: s.category || "general",
          source: matchedItem.source,
          sourceUrl: matchedItem.url,
        });
      }
    } catch (err) {
      console.warn(`[SEOScout] LLM extraction failed for batch starting at index ${i}: ${err.message}`);
    }
  }

  return allSignals;
}

// ─── Main Scan ───────────────────────────────────────────────────────────────

async function runFullScan(dryRun = false) {
  console.log("\n=== SEO Intelligence Scout — Full Scan ===\n");

  const sourcesChecked = [];
  let totalSignalsFound = 0;
  let totalDeduplicated = 0;

  // 1. Gather raw items from all sources
  const allItems = [];

  // Google Search Central Blog (Atom feed)
  const gscBlog = await scrapeRSS(
    "https://developers.google.com/search/blog/atom.xml",
    "google_search_central",
    5
  );
  if (gscBlog.length > 0) {
    allItems.push(...gscBlog);
    sourcesChecked.push("google_search_central");
  }

  // Search Engine Roundtable (XML feed)
  const seRoundtable = await scrapeRSS(
    "https://www.seroundtable.com/index.xml",
    "search_engine_roundtable",
    5
  );
  if (seRoundtable.length > 0) {
    allItems.push(...seRoundtable);
    sourcesChecked.push("search_engine_roundtable");
  }

  // Hacker News
  const hn = await scrapeHN("google seo algorithm update", 5);
  if (hn.length > 0) {
    allItems.push(...hn);
    sourcesChecked.push("hackernews");
  }

  // Reddit Subreddits
  const subreddits = ["SEO", "bigseo", "LocalLLaMA", "MachineLearning", "devops", "webdev"];
  for (const sub of subreddits) {
    const posts = await scrapeReddit(sub, 5);
    if (posts && posts.length > 0) {
      allItems.push(...posts);
      sourcesChecked.push(`reddit_r_${sub}`);
    }
  }

  console.log(`\n[SEOScout] Gathered ${allItems.length} raw items from ${sourcesChecked.length} sources.`);

  if (allItems.length === 0) {
    console.log("[SEOScout] No items found. Skipping LLM extraction.");
    return;
  }

  // 2. Extract signals via LLM (in batches to avoid rate limits)
  console.log(`[SEOScout] Extracting signals from ${allItems.length} items (in batches)...`);
  const allSignals = await extractSignals(allItems);

  console.log(`\n[SEOScout] Extracted ${allSignals.length} raw signals.`);

  // 3. Insert into memory (with deduplication)
  if (!dryRun) {
    for (const sig of allSignals) {
      if (!sig.text || sig.text.length < 10) continue;

      // Official Google sources get higher default confidence and longer TTL
      const isOfficial = sig.source === "google_search_central";
      const ttlMonths = isOfficial ? 12 : 6;
      const adjustedConfidence = isOfficial ? Math.max(sig.confidence, 0.9) : sig.confidence;

      const inserted = insertSignal({
        source: sig.source,
        sourceUrl: sig.sourceUrl,
        text: sig.text,
        category: sig.category,
        confidence: adjustedConfidence,
        ttlMonths,
      });

      if (inserted) {
        totalSignalsFound++;
        console.log(`  ✅ [${(adjustedConfidence * 100).toFixed(0)}%] ${sig.text.slice(0, 80)}...`);
      } else {
        totalDeduplicated++;
      }
    }

    // 4. Run expiry
    const expired = expireStaleSignals();

    // 5. Log the run
    logScoutRun({
      sourcesChecked,
      signalsFound: totalSignalsFound,
      signalsExpired: expired,
      signalsDeduplicated: totalDeduplicated,
    });

    console.log(`\n=== Scout Run Complete ===`);
    console.log(`  New signals:     ${totalSignalsFound}`);
    console.log(`  Deduplicated:    ${totalDeduplicated}`);
    console.log(`  Expired:         ${expired}`);
  } else {
    console.log("\n[DRY RUN] Would have processed these signals:");
    for (const sig of allSignals) {
      console.log(`  [${(sig.confidence * 100).toFixed(0)}%] (${sig.category}) ${sig.text}`);
    }
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

import { fileURLToPath as _fileURLToPath } from "url";
if (process.argv[1] === _fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];

  if (cmd === "scan") {
    const dryRun = process.argv.includes("--dry-run");
    runFullScan(dryRun).catch((err) => {
      console.error("[SEOScout] Fatal error:", err.message);
      process.exit(1);
    });
  } else if (cmd === "dashboard") {
    const d = getMemoryDashboard();
    console.log("\n=== SEO Memory Dashboard ===");
    console.log(`Total signals:     ${d.total}`);
    console.log(`Active (≥0.5):     ${d.active}`);
    console.log(`Low confidence:    ${d.lowConf}`);
    console.log(`Expired:           ${d.expired}`);
    console.log(`Last scout run:    ${d.lastRun}`);
    console.log("\nBy source:");
    console.table(d.bySource);
  } else {
    console.log("Usage:");
    console.log("  node scripts/seo_intel_scout.mjs scan [--dry-run]");
    console.log("  node scripts/seo_intel_scout.mjs dashboard");
  }
}
