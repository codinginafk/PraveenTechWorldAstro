import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const SERVICE_ACCOUNT_FILE = path.join(ROOT_DIR, "gcp-service-account.json");

// Helper to check credentials and get authenticated client
function getIndexingClient() {
  if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    throw new Error(`Google service account credentials file not found at: ${SERVICE_ACCOUNT_FILE}`);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });

  return google.indexing({
    version: "v3",
    auth: auth,
  });
}

/**
 * Submit or update a URL in Google Search Index
 * @param {string} url - Target URL to index
 * @param {string} type - 'URL_UPDATED' or 'URL_DELETED'
 */
export async function submitUrl(url, type = "URL_UPDATED") {
  console.log(`[Google Indexer] Initiating submission for: ${url} (${type})`);
  try {
    const indexing = getIndexingClient();
    const res = await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: type,
      },
    });
    console.log(`[Google Indexer] Submission successful!`);
    console.log(`[Google Indexer] Log details:`, JSON.stringify(res.data, null, 2));
    return { success: true, response: res.data };
  } catch (err) {
    console.error(`[Google Indexer] Error publishing URL notification:`, err.message);
    if (err.response && err.response.data) {
      console.error(`[Google Indexer] API Error details:`, JSON.stringify(err.response.data, null, 2));
    }
    return { success: false, error: err.message };
  }
}

/**
 * Retrieve current indexing notification status metadata for a URL
 * @param {string} url - Target URL
 */
export async function getUrlMetadata(url) {
  console.log(`[Google Indexer] Fetching metadata for: ${url}`);
  try {
    const indexing = getIndexingClient();
    const res = await indexing.urlNotifications.getMetadata({
      url: url,
    });
    console.log(`[Google Indexer] Metadata retrieved successfully:`);
    console.log(JSON.stringify(res.data, null, 2));
    return { success: true, metadata: res.data };
  } catch (err) {
    console.error(`[Google Indexer] Error getting URL metadata:`, err.message);
    if (err.response && err.response.data) {
      console.error(`[Google Indexer] API Error details:`, JSON.stringify(err.response.data, null, 2));
    }
    return { success: false, error: err.message };
  }
}

// Support CLI commands
async function runCli() {
  const args = process.argv.slice(2);
  const command = args[0];
  const url = args[1];

  if (!command || !url) {
    console.log("Usage:");
    console.log("  node google-indexer.mjs submit <url>");
    console.log("  node google-indexer.mjs delete <url>");
    console.log("  node google-indexer.mjs status <url>");
    process.exit(1);
  }

  if (command === "submit") {
    const res = await submitUrl(url, "URL_UPDATED");
    process.exit(res.success ? 0 : 1);
  } else if (command === "delete") {
    const res = await submitUrl(url, "URL_DELETED");
    process.exit(res.success ? 0 : 1);
  } else if (command === "status" || command === "metadata") {
    const res = await getUrlMetadata(url);
    process.exit(res.success ? 0 : 1);
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}

if (process.argv[1] && (process.argv[1].endsWith("google-indexer.mjs") || process.argv[1].endsWith("google-indexer"))) {
  runCli().catch(err => {
    console.error("Fatal: CLI execution crashed:", err);
    process.exit(1);
  });
}
