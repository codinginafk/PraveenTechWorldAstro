import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(ROOT_DIR, ".env") });

const SITE_URL = "sc-domain:praveentechworld.com";
const argv = Object.fromEntries(
  process.argv.slice(2).filter((arg) => arg.startsWith("--")).map((arg) => {
    const [key, ...rest] = arg.slice(2).split("=");
    return [key, rest.join("=") || true];
  }),
);

const startDate = argv.start || "2026-08-01";
const endDate = argv.end || "2026-08-22";
const outPath = argv.out || path.join(ROOT_DIR, "research/agents/reports/content-intelligence", `search-data-${endDate}.json`);

function assertDate(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${name} must be YYYY-MM-DD`);
}

assertDate(startDate, "--start");
assertDate(endDate, "--end");

const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(ROOT_DIR, "gcp-service-account.json");
if (!fs.existsSync(serviceAccountPath)) throw new Error(`Missing Google service-account file: ${serviceAccountPath}`);

const { google } = await import("googleapis");
const auth = new google.auth.GoogleAuth({
  keyFile: serviceAccountPath,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});
const searchconsole = google.searchconsole({ version: "v1", auth: await auth.getClient() });

async function gscQuery(dimensions, extra = {}) {
  const response = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions,
      rowLimit: 25_000,
      dataState: "final",
      ...extra,
    },
  });
  return response.data.rows || [];
}

const gsc = {
  pages: await gscQuery(["page"]),
  queries: await gscQuery(["query"]),
  pageQuery: await gscQuery(["page", "query"]),
  datePages: await gscQuery(["date", "page"]),
  dateQueries: await gscQuery(["date", "query"]),
};

let bing = null;
if (process.env.BING_API_KEY) {
  const { fetchAllBingData } = await import("./bing-client.mjs");
  bing = await fetchAllBingData();
}

const result = {
  fetchedAt: new Date().toISOString(),
  trustedThrough: endDate,
  period: { startDate, endDate },
  completeness: "final GSC data through explicit end date; Bing API period is provider-defined",
  gsc,
  bing,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");

console.log(JSON.stringify({
  outPath,
  fetchedAt: result.fetchedAt,
  trustedThrough: endDate,
  gscRows: {
    pages: gsc.pages.length,
    queries: gsc.queries.length,
    pageQuery: gsc.pageQuery.length,
    datePages: gsc.datePages.length,
    dateQueries: gsc.dateQueries.length,
  },
  bingFetched: Boolean(bing),
}, null, 2));
