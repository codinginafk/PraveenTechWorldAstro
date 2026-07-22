import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OAUTH_FILE = path.resolve(__dirname, "syndication/blogger-oauth.json");

let existing = {};
try { existing = JSON.parse(fs.readFileSync(OAUTH_FILE, "utf-8")); } catch {}

const CLIENT_ID = existing.client_id || process.env.BLOGGER_CLIENT_ID || "";
const CLIENT_SECRET = existing.client_secret || process.env.BLOGGER_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost";
const SCOPES = ["https://www.googleapis.com/auth/blogger"];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `response_type=code&` +
  `scope=${encodeURIComponent(SCOPES.join(" "))}&` +
  `access_type=offline&` +
  `prompt=consent`;

console.log("\n==============================================");
console.log("  BLOGGER OAUTH AUTHENTICATION");
console.log("==============================================");
console.log("\n1. Open this URL in your browser:");
console.log(`\n${authUrl}\n`);
console.log("2. Sign in with the Google account that owns the blog (techworldpraveen@gmail.com)");
console.log("3. Click 'Advanced' → 'Go to localhost (unsafe)' if you see a warning");
console.log("4. After authorizing, the browser will show an error page (that's OK)");
console.log("5. COPY the full URL of that error page and paste it below\n");

rl.question("Paste the redirect URL here:\n> ", async (input) => {
  input = input.trim();
  
  // Extract code from the URL
  const urlMatch = input.match(/[?&]code=([^&]+)/);
  if (!urlMatch) {
    console.log("\nCould not find 'code' parameter in the URL. Make sure you paste the full redirect URL.");
    console.log("It should look like: http://localhost/?code=4/0A...&scope=...");
    rl.close();
    process.exit(1);
  }
  const code = decodeURIComponent(urlMatch[1]);
  console.log("\nAuthorization code found, exchanging for tokens...");

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.log(`Token exchange failed: ${JSON.stringify(data)}`);
      rl.close();
      process.exit(1);
    }

    if (!data.refresh_token) {
      console.log("\n⚠ No new refresh_token issued. Google only issues it on first auth.");
      console.log("  This means the existing token is still valid, or you've already authorized before.");
      console.log("  If the existing token is expired, you need to revoke access and try again:");
      console.log("  https://myaccount.google.com/permissions → remove 'Blogger API' access, then re-run.");
      rl.close();
      process.exit(0);
    }

    const oauth = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: data.refresh_token,
      blog_id: existing.blog_id || "5793911798769605489",
    };

    fs.writeFileSync(OAUTH_FILE, JSON.stringify(oauth, null, 2), "utf-8");
    console.log(`\n✅ New OAuth credentials saved!`);
    console.log(`   Blog ID: ${oauth.blog_id}`);
    console.log(`\nNow run the backfill: node research/agents/blogger-backfill.mjs\n`);
  } catch (err) {
    console.log(`\nError: ${err.message}`);
  }

  rl.close();
});
