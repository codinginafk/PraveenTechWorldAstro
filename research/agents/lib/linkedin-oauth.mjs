import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.resolve(__dirname, "../../../.env");
const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || "";
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost:8080";
const SCOPES = "w_member_social,r_liteprofile,r_emailaddress";

const AUTH_URL = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${encodeURIComponent(SCOPES)}`;

function saveToEnv(key, value) {
  let env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf-8") : "";
  const regex = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  if (regex.test(env)) {
    env = env.replace(regex, line);
  } else {
    env += `\n${line}\n`;
  }
  fs.writeFileSync(ENV_FILE, env, "utf-8");
  console.log(`  Saved ${key} to .env`);
}

async function exchangeCode(code) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("  Token exchange failed:", JSON.stringify(data, null, 2));
    process.exit(1);
  }
  return data;
}

async function getPersonUrn(accessToken) {
  const res = await fetch("https://api.linkedin.com/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("  Failed to get person URN:", JSON.stringify(data, null, 2));
    return null;
  }
  const urn = `urn:li:person:${data.sub}`;
  console.log(`  Person URN: ${urn}`);
  return urn;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h1>Error</h1><p>${error}</p><p>Close this tab and try again.</p>`);
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<h1>Authorization successful!</h1><p>Close this tab and check the terminal.</p>`);
        server.close();
        resolve(code);
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<h1>Waiting for authorization...</h1><p>No code received.</p>`);
      }
    });

    server.listen(8080, () => {
      console.log(`\n  Listening on http://localhost:8080`);
      console.log(`\n  Step 1: Visit this URL in your browser and authorize:\n`);
      console.log(`  ${AUTH_URL}\n`);
      console.log(`  Step 2: After authorizing, you'll be redirected back here.`);
      console.log(`  The token will be saved to .env automatically.\n`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        reject(new Error("Port 8080 is already in use. Close whatever is using it or change REDIRECT_URI."));
      } else {
        reject(err);
      }
    });
  });
}

async function main() {
  console.log("\n=== LinkedIn OAuth 2.0 Token Generator ===\n");

  try {
    const code = await startServer();
    console.log("\n  Authorization code received! Exchanging for token...\n");

    const tokenData = await exchangeCode(code);
    console.log("  Token received!\n");
    console.log(`  Access Token: ${tokenData.access_token.slice(0, 20)}...${tokenData.access_token.slice(-10)}`);
    console.log(`  Expires in: ${tokenData.expires_in} seconds (${Math.round(tokenData.expires_in / 86400)} days)`);

    saveToEnv("LINKEDIN_ACCESS_TOKEN", tokenData.access_token);

    console.log("\n  Fetching your LinkedIn Person URN...");
    const personUrn = await getPersonUrn(tokenData.access_token);
    if (personUrn) {
      saveToEnv("LINKEDIN_PERSON_URN", personUrn);
    }

    if (tokenData.refresh_token) {
      console.log("\n  Refresh token also received! Saving for automatic renewal.");
      saveToEnv("LINKEDIN_REFRESH_TOKEN", tokenData.refresh_token);
    }

    console.log("\n✓ LinkedIn setup complete! Run the syndication agent to test.\n");

    if (tokenData.expires_in < 86400 * 60) {
      console.log("  Note: Standard LinkedIn tokens expire in 60 days.");
      console.log("  To get a 6-month token, apply for LinkedIn's Long-Lived Token program.\n");
    }
  } catch (err) {
    console.error(`\n  Failed: ${err.message}\n`);
    process.exit(1);
  }
}

main();
