import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const saPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(ROOT_DIR, "gcp-service-account.json");
if (!fs.existsSync(saPath)) {
  console.log("No key");
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: saPath,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});

const webmasters = google.webmasters({ version: "v3", auth: await auth.getClient() });
const res = await webmasters.sites.list();
console.log("Authorized GSC properties:", res.data.siteEntry);
