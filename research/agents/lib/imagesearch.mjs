import fs from "fs";
import path from "path";
import { callLLM } from "./shared.mjs";

const USER_AGENT = "PraveenTechWorld/1.0 (article-generator)";

export async function searchImage(keywords, slug, articleTitle, assetsDir) {
  for (const kw of keywords) {
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
      // Relevance check: file title should share at least one word with query
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
  // Strip HTML tags
  val = val.replace(/<[^>]*>/g, "").trim();
  // Decode common entities
  val = val.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // Strip lengthy URLs
  val = val.replace(/https?:\/\/\S+/g, "").trim();
  return val;
}

function buildCredit(artist, license) {
  const parts = [];
  if (artist) parts.push(artist);
  if (license && license.toUpperCase() !== "CC0" && license.toUpperCase() !== "PUBLIC DOMAIN") parts.push(license);
  return parts.length ? parts.join(" — ") : "";
}

export function extractKeywords(title, tags, category) {
  const kws = [];
  // Priority 1: tags as search terms (most descriptive)
  if (tags) tags.forEach(t => { const s = String(t).trim(); if (s.length > 2) kws.push(s); });
  // Priority 2: short meaningful phrases from title (2-4 words)
  const titleClean = title.replace(/^(how to|what is|why|does|can|the|a|an|is|are|do)\s+/i, "").replace(/in \d{4}.*$/, "").replace(/[:–—\-—][\s\S]*$/, "").replace(/[^\w\s]/g, "").trim();
  const words = titleClean.split(/\s+/).filter(Boolean);
  if (words.length > 2) kws.push(words.slice(0, 4).join(" "));
  if (words.length > 3) kws.push(words.slice(1, 5).join(" "));
  // Priority 3: category-specific terms
  const catMap = {
    "windows-fixes": ["Windows error screen", "computer repair", "technology"],
    "android-fixes": ["Android smartphone", "mobile phone", "technology"],
    "ai-tools": ["artificial intelligence", "AI technology", "robot"],
    "ai-workflows": ["AI productivity", "workspace technology"],
    "productivity": ["workspace organization", "office productivity"],
    "career-growth": ["career development", "professional growth"],
    "privacy": ["data privacy protection", "online security"],
    "security": ["cybersecurity", "computer security"],
    "free-software": ["open source software", "free technology"],
    "automation": ["automation technology", "smart automation"],
  };
  if (catMap[category]) catMap[category].forEach(w => kws.push(w));
  // Priority 4: generic fallbacks
  kws.push("technology", "digital", "computer");
  return [...new Set(kws)];
}
