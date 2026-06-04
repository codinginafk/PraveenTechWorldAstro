import fs from "fs";
import path from "path";
import { callLLM } from "./shared.mjs";

const USER_AGENT = "PraveenTechWorld/1.0 (article-generator)";

export async function searchImage(keywords, slug, articleTitle, assetsDir) {
  for (const kw of keywords) {
    const unsplash = await tryUnsplash(kw);
    if (unsplash) {
      console.log(`  Image found via Unsplash: "${kw}"`);
      return unsplash;
    }
    const commons = await tryCommons(kw);
    if (commons) {
      console.log(`  Image found via Commons: "${kw}"`);
      return commons;
    }
    const openverse = await tryOpenverse(kw);
    if (openverse) {
      console.log(`  Image found via Openverse: "${kw}"`);
      return openverse;
    }
  }
  console.log(`  No external image found, generating SVG fallback`);
  return await generateSVG(slug, articleTitle, assetsDir);
}

async function tryUnsplash(query) {
  try {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return null;
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&client_id=${key}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept-Version": "v1" } });
    if (!res.ok) return null;
    const data = await res.json();
    const results = data?.results || [];
    for (const r of results) {
      if (!r.urls?.regular) continue;
      // Trigger download tracking (Unsplash requirement)
      if (r.links?.download_location) {
        fetch(r.links.download_location + `&client_id=${key}`).catch(() => {});
      }
      const credit = `Photo by ${r.user?.name || "Unknown"} on Unsplash`;
      const alt = r.alt_description || r.description || "";
      // Use regular URL with size params for our layout (1200x600 crop)
      const url = `${r.urls.raw}&w=1200&h=600&fit=crop`;
      return { url, credit, alt };
    }
  } catch {}
  return null;
}

async function tryCommons(query) {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&format=json&gsrlimit=10`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const entries = Object.values(pages);
    for (const entry of entries) {
      const title = entry.title || "";
      const ext = title.split(".").pop()?.toLowerCase();
      if (!ext || ["pdf", "svg", "gif"].includes(ext)) continue;
      const info = entry.imageinfo?.[0];
      if (!info?.url) continue;
      if (!/\.(jpg|jpeg|png|webp)$/i.test(info.url)) continue;
      const titleLower = title.toLowerCase();
      const hasMatch = queryWords.some(w => titleLower.includes(w));
      if (queryWords.length > 0 && !hasMatch) continue;
      const meta = info.extmetadata || {};
      const artist = parseMeta(meta.Artist);
      const license = parseMeta(meta.LicenseShortName);
      const credit = buildCredit(artist, license);
      const alt = title.replace(/^File:/, "").replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      return { url: info.url, credit, alt };
    }
  } catch {}
  return null;
}

async function tryOpenverse(query) {
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=5&license=cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa,cc-by-nd,cc-by-nc-nd`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const results = data?.results || [];
    for (const r of results) {
      if (!r.url) continue;
      if (!/\.(jpg|jpeg|png|webp)$/i.test(r.url)) continue;
      if ((r.height || 0) >= 500 && (r.width || 0) >= 500) {
        return { url: r.url, credit: r.attribution || "", alt: r.title || "" };
      }
    }
    for (const r of results) {
      if (r.url) return { url: r.url, credit: r.attribution || "", alt: r.title || "" };
    }
  } catch {}
  return null;
}

async function generateSVG(slug, title, assetsDir) {
  const prompt = `Generate a simple, clean SVG illustration for a tech blog article titled "${title}". The SVG must be exactly 800x400 pixels with viewBox="0 0 800 400". Use a light background (#f8f9fa). Include simple geometric shapes and icons representing the topic. Use only basic SVG elements (rect, circle, path, text). No external fonts or images. Keep it minimal and professional. Return ONLY valid SVG code, no markdown, no explanation, no backticks.`;
  let svgCode = await callLLM("You generate clean SVG illustrations.", prompt, { temperature: 0.3, maxTokens: 1024 });
  if (!svgCode) return null;
  svgCode = svgCode.trim();
  svgCode = svgCode.replace(/^```(?:svg)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!svgCode.startsWith("<svg")) svgCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400">${svgCode}</svg>`;
  if (!svgCode.includes("viewBox")) svgCode = svgCode.replace("<svg", '<svg viewBox="0 0 800 400"');
  const dir = path.join(assetsDir, "public/images/generated");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${slug}.svg`);
  fs.writeFileSync(filePath, svgCode, "utf-8");
  console.log(`  SVG illustration saved: public/images/generated/${slug}.svg`);
  return { url: `/images/generated/${slug}.svg`, credit: "", alt: `Illustration for ${title}` };
}

function parseMeta(field) {
  if (!field) return "";
  let val = "";
  if (typeof field === "string") val = field;
  else if (typeof field === "object" && field?.value) val = field.value;
  else return "";
  val = val.replace(/<[^>]*>/g, "").trim();
  val = val.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  val = val.replace(/https?:\/\/\S+/g, "").trim();
  return val;
}

function buildCredit(artist, license) {
  const parts = [];
  if (artist) { let a = artist.replace(/\s+/g, " ").trim(); if (a.length < 80) parts.push(a); }
  if (license && license.toUpperCase() !== "CC0" && license.toUpperCase() !== "PUBLIC DOMAIN") { let l = license.replace(/\s+/g, " ").trim(); if (l.length < 40) parts.push(l); }
  return parts.length ? parts.join(" — ") : "";
}

const STOP_WORDS = new Set([
  "the","a","an","in","on","at","to","for","of","with","by","from","and","or",
  "is","are","was","were","been","being","have","has","had","do","does","did",
  "will","would","can","could","should","may","might","must","shall",
  "get","use","set","fix","make","take","find","learn","build","create",
  "improve","remove","write","add","put","run","keep","stop","start","get",
  "your","our","their","its","his","her","how","what","why","when","where"
]);

export function extractKeywords(title, tags, category) {
  const kws = [];
  // Strip noise
  let clean = title
    .replace(/^(how to|what is|why|does|can|is|are|do|the|a|an)\s+/i, "")
    .replace(/in \d{4}.*$/i, "")
    .replace(/[:–—\-—?][\s\S]*$/, "")
    .replace(/[^\w\s]/g, "")
    .trim();
  const words = clean.split(/\s+/).filter(w => w.length > 1);
  // Extract meaningful content words (skip verbs and stop words)
  const contentWords = words.filter(w => !STOP_WORDS.has(w.toLowerCase()));
  // Primary: Short specific phrase from content words (2-3 words)
  if (contentWords.length >= 2) {
    kws.push(contentWords.slice(0, 3).join(" "));
    kws.push(contentWords.slice(0, 2).join(" "));
  }
  // Secondary: Skip first word if it's verb-like, take next 2-3
  const skipVerbs = new Set(["fix","remove","learn","build","create","get","use","set","write","speed","improve","automate","make","take"]);
  let startIdx = 0;
  if (words.length > 1 && skipVerbs.has(words[0].toLowerCase())) startIdx = 1;
  if (words.length >= startIdx + 2) {
    kws.push(words.slice(startIdx, startIdx + 3).join(" "));
    kws.push(words.slice(startIdx, startIdx + 2).join(" "));
  }
  // Tags
  if (tags) tags.forEach(t => { const s = String(t).trim(); if (s.length > 2) kws.push(s); });
  // Category-specific
  const catMap = {
    "windows-fixes": ["Windows 11 error screen", "Windows update", "computer"],
    "android-fixes": ["Android smartphone", "phone battery", "mobile"],
    "ai-tools": ["artificial intelligence", "AI technology", "ChatGPT"],
    "ai-workflows": ["AI productivity", "workspace"],
    "productivity": ["workspace organization", "productivity"],
    "career-growth": ["career development", "professional"],
    "privacy": ["data privacy", "online security"],
    "security": ["cybersecurity", "computer security"],
    "free-software": ["open source", "free software"],
    "automation": ["workflow automation", "technology"],
  };
  if (catMap[category]) catMap[category].forEach(w => kws.push(w));
  kws.push("technology", "digital");
  return [...new Set(kws)];
}
