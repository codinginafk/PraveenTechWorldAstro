import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "../lib/shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const STATE_FILE = path.join(__dirname, "..", "state.json");

const SITE_URL = "https://www.praveentechworld.com";
const GSC_SITE_URL = "sc-domain:praveentechworld.com";
const SITEMAP_URL = `${SITE_URL}/sitemap-index.xml`;

const INDEXNOW_KEY = "b5ccb860-ee82-4baa-9416-61b965ff55d7";

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function getServiceAccountPath() {
  return process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(ROOT_DIR, "gcp-service-account.json");
}

export async function pingIndexNow() {
  log("[GSC Client] Pinging IndexNow (Bing + partners)...");
  const urls = [SITE_URL, SITEMAP_URL];

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "www.praveentechworld.com",
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      log(`[GSC Client] IndexNow ping successful (HTTP ${res.status})`);
      const state = loadState();
      state.lastIndexNowPing = new Date().toISOString();
      saveState(state);
      return true;
    }
    log(`[GSC Client] IndexNow ping returned HTTP ${res.status}: ${await res.text().catch(() => "")}`);
    return false;
  } catch (err) {
    log(`[GSC Client] IndexNow ping failed: ${err.message}`);
    return false;
  }
}

export async function pingPingomatic() {
  log("[GSC Client] Pinging Ping-o-Matic...");
  try {
    const res = await fetch("https://pingomatic.com/ping/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        title: "PraveenTechWorld",
        blogurl: SITE_URL,
        rssurl: `${SITE_URL}/rss.xml`,
        chk_weblogscom: "on",
        chk_blogs: "on",
        chk_feedburner: "on",
        chk_newsgator: "on",
        chk_technorati: "on",
        chk_pingomatic: "on",
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      log(`[GSC Client] Ping-o-Matic ping successful (HTTP ${res.status})`);
      return true;
    }
    log(`[GSC Client] Ping-o-Matic returned HTTP ${res.status}`);
    return false;
  } catch (err) {
    log(`[GSC Client] Ping-o-Matic ping failed: ${err.message}`);
    return false;
  }
}

export async function submitSitemapViaGscApi() {
  const saPath = getServiceAccountPath();
  if (!fs.existsSync(saPath)) {
    log("[GSC Client] OAuth key not found. Google deprecated the public sitemap ping endpoint.");
    log("[GSC Client] To enable automatic Google notification:");
    log(`  1. Create a GCP service account at console.cloud.google.com`);
    log(`  2. Enable Search Console API, download JSON key`);
    log(`  3. Save to: ${saPath}`);
    log(`  4. Go to GSC -> Settings -> Users -> Add user`);
    log(`  5. Paste the service account email, grant Owner (Full) permission`);
    log(`     Note: Any GCP IAM role (e.g. Viewer) is fine —`);
    log(`     the actual permission comes from GSC Settings, not GCP IAM.`);
    log(`  6. If GSC says 'email not found', wait 5-10 min for propagation, then retry.`);
    log("[GSC Client] Using IndexNow + Ping-o-Matic as fallback.");
    return false;
  }

  try {
    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      keyFile: saPath,
      scopes: ["https://www.googleapis.com/auth/webmasters"],
    });
    const webmasters = google.webmasters({ version: "v3", auth: await auth.getClient() });

    await webmasters.sitemaps.submit({
      siteUrl: GSC_SITE_URL,
      feedpath: SITEMAP_URL,
    });

    log(`[GSC Client] Sitemap submitted to Google via GSC API`);
    const state = loadState();
    state.lastGscSitemapSubmit = new Date().toISOString();
    saveState(state);
    return true;
  } catch (err) {
    log(`[GSC Client] GSC API submission failed: ${err.message}`);
    return false;
  }
}

export async function pingGoogleSitemap() {
  log("[GSC Client] Notifying Google via all available channels...");
  let success = false;

  const indexNowOk = await pingIndexNow();
  if (indexNowOk) success = true;

  const pomaticOk = await pingPingomatic();
  if (pomaticOk) success = true;

  const gscOk = await submitSitemapViaGscApi();
  if (gscOk) success = true;

  if (success) {
    log("[GSC Client] Google notification complete via one or more channels.");
  } else {
    log("[GSC Client] All notification channels failed. Google will still discover via sitemap on next crawl.");
    log("[GSC Client] Speed this up by manually requesting indexing in GSC URL Inspection tool.");
  }

  return success;
}

export async function inspectUrl(urlPath) {
  const saPath = getServiceAccountPath();
  if (!fs.existsSync(saPath)) {
    log("[GSC Client] OAuth required for URL inspection. No service account key found.");
    return null;
  }

  try {
    const fullUrl = urlPath.startsWith("http") ? urlPath : `${SITE_URL}${urlPath}`;
    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      keyFile: saPath,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    const searchconsole = google.searchconsole({ version: "v1", auth: await auth.getClient() });

    const res = await searchconsole.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: fullUrl,
        siteUrl: GSC_SITE_URL,
      },
    });

    const result = res.data.inspectionResult;
    log(`[GSC Client] URL inspection for ${urlPath}: ${result?.indexStatusResult?.verdict || "unknown"}`);
    return {
      url: fullUrl,
      verdict: result?.indexStatusResult?.verdict || "UNKNOWN",
      coverageState: result?.indexStatusResult?.coverageState || "unknown",
    };
  } catch (err) {
    log(`[GSC Client] URL inspection failed: ${err.message}`);
    return null;
  }
}

export async function checkUrlIndexed(urlPath) {
  const result = await inspectUrl(urlPath);
  if (!result) return { indexed: null, error: "inspection_failed" };
  return {
    indexed: result.verdict === "PASS",
    verdict: result.verdict,
    coverageState: result.coverageState,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] || "ping";
  const actions = {
    ping: pingGoogleSitemap,
    indexnow: pingIndexNow,
    pingomatic: pingPingomatic,
    submit: submitSitemapViaGscApi,
  };
  const action = actions[cmd] || actions.ping;
  action().catch((err) => {
    console.error(`[GSC Client] ${cmd} failed:`, err);
    process.exit(1);
  });
}
