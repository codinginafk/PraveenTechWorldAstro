import path from "node:path";
import { google } from "googleapis";

const DAY_MS = 86_400_000;
const SITE_URL = "sc-domain:praveentechworld.com";
const DOMAIN = "https://www.praveentechworld.com";
const WINDOW_DAYS = Number(process.env.GSC_WINDOW_DAYS || 30);
const LAG_DAYS = Number(process.env.GSC_LAG_DAYS || 3);
const MIN_IMPRESSIONS = Number(process.env.GSC_MIN_IMPRESSIONS || 10);

const targets = [
  "does-resetting-windows-remove-viruses-completely",
  "how-to-fix-windows-11-kb5121003-inpoutx64-crash",
  "windows-11-volume-control-not-working-8-proven-fixes-for-2026",
  "how-to-run-deepseek-r1-locally-on-8gb-vram",
  "how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11",
  "how-to-fix-clock-watchdog-timeout-0x101-blue-screen-error-windows-11",
  "how-to-fix-kmode-exception-not-handled-0x1e-blue-screen",
];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, amount) {
  return new Date(date.getTime() + amount * DAY_MS);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function pagePath(value) {
  try {
    const url = new URL(value, DOMAIN);
    return url.pathname.replace(/\/$/, "");
  } catch {
    return String(value || "").replace(DOMAIN, "").replace(/\/$/, "");
  }
}

function targetForPage(value) {
  const pathname = pagePath(value);
  return targets.find((slug) => pathname === `/blog/${slug}`) || null;
}

const finalEnd = addDays(new Date(), -LAG_DAYS);
const startDate = addDays(finalEnd, -(WINDOW_DAYS - 1));

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), "gcp-service-account.json"),
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});
const api = google.searchconsole({ version: "v1", auth: await auth.getClient() });

const response = await api.searchanalytics.query({
  siteUrl: SITE_URL,
  requestBody: {
    startDate: isoDate(startDate),
    endDate: isoDate(finalEnd),
    dimensions: ["page", "query"],
    rowLimit: 25_000,
    dataState: "final",
    type: "web",
  },
});

const rows = (response.data.rows || [])
  .map((row) => {
    const page = row.keys?.[0] || "";
    const query = row.keys?.[1] || "";
    const impressions = Number(row.impressions) || 0;
    const clicks = Number(row.clicks) || 0;
    const position = round(row.position, 1);
    const ctr = impressions ? round((clicks / impressions) * 100, 2) : 0;
    const slug = targetForPage(page);
    return {
      slug,
      page: pagePath(page),
      query,
      impressions,
      clicks,
      ctr,
      position,
      // A transparent sorting heuristic, not a traffic forecast.
      priorityScore: round(impressions / Math.max(position, 1), 2),
    };
  })
  .filter((row) => row.slug && row.impressions >= MIN_IMPRESSIONS && row.position >= 4 && row.position <= 20)
  .sort((a, b) => b.priorityScore - a.priorityScore || b.impressions - a.impressions);

const byPage = Object.fromEntries(targets.map((slug) => [slug, rows.filter((row) => row.slug === slug).slice(0, 15)]));

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: "Google Search Console Search Analytics API",
  siteUrl: SITE_URL,
  window: {
    startDate: isoDate(startDate),
    endDate: isoDate(finalEnd),
    days: WINDOW_DAYS,
    excludedTrailingDays: LAG_DAYS,
    dataState: "final",
  },
  filters: {
    minimumImpressions: MIN_IMPRESSIONS,
    positionRange: "4.0-20.0",
    note: "Query/page rows exclude anonymized queries and are opportunity data, not site totals.",
  },
  opportunitiesByPage: byPage,
}, null, 2));
