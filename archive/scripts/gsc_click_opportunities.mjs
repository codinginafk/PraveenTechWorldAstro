import path from "node:path";
import { google } from "googleapis";

const DAY_MS = 86_400_000;
const SITE_URL = "sc-domain:praveentechworld.com";
const DOMAIN = "https://www.praveentechworld.com";

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

function rowKey(row) {
  return (row.keys || []).join("\u001f");
}

function normalizeRow(row, dimensions) {
  const result = {};
  dimensions.forEach((dimension, index) => {
    let value = row.keys?.[index] || "";
    if (dimension === "page") value = value.replace(DOMAIN, "");
    result[dimension] = value;
  });
  return {
    ...result,
    clicks: Number(row.clicks) || 0,
    impressions: Number(row.impressions) || 0,
    ctr: round((Number(row.ctr) || 0) * 100),
    position: round(row.position),
  };
}

function compareRows(currentRows, previousRows, dimensions) {
  const previous = new Map(previousRows.map((row) => [rowKey(row), row]));
  return currentRows.map((row) => {
    const normalized = normalizeRow(row, dimensions);
    const old = previous.get(rowKey(row));
    return {
      ...normalized,
      clickChange: round(normalized.clicks - (old?.clicks || 0)),
      impressionChange: round(normalized.impressions - (old?.impressions || 0)),
      ctrChange: round(normalized.ctr - ((old?.ctr || 0) * 100)),
      positionChange: old ? round(old.position - normalized.position) : null,
      isNew: !old,
    };
  });
}

async function query(api, startDate, endDate, dimensions) {
  const response = await api.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions,
      rowLimit: 25_000,
      dataState: "final",
      type: "web",
    },
  });
  return response.data.rows || [];
}

function totals(rows) {
  const clicks = rows.reduce((sum, row) => sum + (Number(row.clicks) || 0), 0);
  const impressions = rows.reduce((sum, row) => sum + (Number(row.impressions) || 0), 0);
  return {
    clicks: round(clicks),
    impressions: round(impressions),
    ctr: impressions ? round((clicks / impressions) * 100) : 0,
  };
}

const finalEnd = addDays(new Date(), -3);
const currentStart = addDays(finalEnd, -6);
const previousEnd = addDays(currentStart, -1);
const previousStart = addDays(previousEnd, -6);

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), "gcp-service-account.json"),
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});
const api = google.searchconsole({ version: "v1", auth: await auth.getClient() });

const dimensions = ["query", "page"];
const [previousRows, currentRows, previousPageRows, currentPageRows, previousTotalRows, currentTotalRows, countryRows, deviceRows] = await Promise.all([
  query(api, isoDate(previousStart), isoDate(previousEnd), dimensions),
  query(api, isoDate(currentStart), isoDate(finalEnd), dimensions),
  query(api, isoDate(previousStart), isoDate(previousEnd), ["page"]),
  query(api, isoDate(currentStart), isoDate(finalEnd), ["page"]),
  query(api, isoDate(previousStart), isoDate(previousEnd), []),
  query(api, isoDate(currentStart), isoDate(finalEnd), []),
  query(api, isoDate(currentStart), isoDate(finalEnd), ["country"]),
  query(api, isoDate(currentStart), isoDate(finalEnd), ["device"]),
]);

const compared = compareRows(currentRows, previousRows, dimensions);
const comparedPages = compareRows(currentPageRows, previousPageRows, ["page"]);
const opportunities = compared
  .filter((row) => row.impressions >= 5 && row.position >= 4 && row.position <= 30)
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, 30);
const declining = compared
  .filter((row) => row.impressionChange <= -5 || row.clickChange <= -2)
  .sort((a, b) => a.clickChange - b.clickChange || a.impressionChange - b.impressionChange)
  .slice(0, 20);
const emerging = compared
  .filter((row) => row.isNew && row.impressions >= 5)
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, 20);

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  dataLagDays: 3,
  previousWindow: { startDate: isoDate(previousStart), endDate: isoDate(previousEnd), ...totals(previousTotalRows) },
  currentWindow: { startDate: isoDate(currentStart), endDate: isoDate(finalEnd), ...totals(currentTotalRows) },
  queryPageCoverage: {
    previous: totals(previousRows),
    current: totals(currentRows),
    note: "Query/page rows exclude anonymized queries and must not be used as site totals.",
  },
  topPages: comparedPages
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, 30),
  pageOpportunities: comparedPages
    .filter((row) => row.impressions >= 20 && row.position >= 4 && row.position <= 30)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 30),
  opportunities,
  declining,
  emerging,
  countries: countryRows.map((row) => normalizeRow(row, ["country"])).slice(0, 20),
  devices: deviceRows.map((row) => normalizeRow(row, ["device"])),
}, null, 2));
