import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

const isDryRun = process.argv.includes("--dry-run");

// 1. Gather CI/CD Context
const workflowName = process.env.GITHUB_WORKFLOW || "CI/CD Pipeline";
const runId = process.env.GITHUB_RUN_ID || "local-test";
const runAttempt = process.env.GITHUB_RUN_ATTEMPT || "1";
const repo = process.env.GITHUB_REPOSITORY || "codinginafk/PraveenTechWorldAstro";
const branch = process.env.GITHUB_REF_NAME || "main";
const sha = (process.env.GITHUB_SHA || "unknown").substring(0, 7);
const actor = process.env.GITHUB_ACTOR || "system";
const runUrl = process.env.GITHUB_RUN_ID
  ? `https://github.com/${repo}/actions/runs/${runId}`
  : "https://github.com/codinginafk/PraveenTechWorldAstro/actions";

const alertRecipient = process.env.ALERT_EMAIL || "contact@praveentechworld.com";
const fromEmail = process.env.SMTP_USER || "ci-alert@praveentechworld.com";

console.log("=================================================");
console.log("🚨  PTW CI/CD FAILURE ALERT DISPATCHER");
console.log("=================================================");
console.log(`Workflow: ${workflowName}`);
console.log(`Repository: ${repo}`);
console.log(`Branch: ${branch} (${sha})`);
console.log(`Run URL: ${runUrl}`);
console.log(`Triggered By: ${actor}`);
console.log("=================================================");

const emailSubject = `🚨 CI/CD Build Failure: ${workflowName} on ${branch} (${sha})`;

const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #18181b; background-color: #f4f4f5; padding: 24px; }
    .card { background: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; max-width: 620px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #dc2626; color: #ffffff; padding: 20px 24px; font-weight: 700; font-size: 18px; }
    .body { padding: 24px; }
    .metric { margin-bottom: 12px; display: flex; justify-content: space-between; border-bottom: 1px dashed #e4e4e7; padding-bottom: 8px; font-size: 14px; }
    .label { font-weight: 600; color: #71717a; }
    .value { font-weight: 700; color: #09090b; }
    .btn { display: inline-block; background: #dc2626; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 18px; }
    .footer { font-size: 12px; color: #a1a1aa; padding: 16px 24px; background: #fafafa; border-top: 1px solid #f4f4f5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      ⚠️ CI/CD Quality Gate Failed
    </div>
    <div class="body">
      <p>A build, audit, or scheduled publishing job failed on <strong>PraveenTechWorld</strong>. Immediate review is required to prevent broken production states or deployment lag.</p>
      
      <div class="metric">
        <span class="label">Workflow</span>
        <span class="value">${workflowName}</span>
      </div>
      <div class="metric">
        <span class="label">Branch</span>
        <span class="value">${branch}</span>
      </div>
      <div class="metric">
        <span class="label">Commit</span>
        <span class="value"><code>${sha}</code></span>
      </div>
      <div class="metric">
        <span class="label">Triggered By</span>
        <span class="value">${actor}</span>
      </div>
      <div class="metric">
        <span class="label">Run Attempt</span>
        <span class="value">#${runAttempt}</span>
      </div>

      <div style="margin-top: 20px;">
        <a href="${runUrl}" class="btn" target="_blank">View GitHub Actions Run Logs →</a>
      </div>
    </div>
    <div class="footer">
      Automated alert sent by PraveenTechWorld CI/CD Failure Notifier.
    </div>
  </div>
</body>
</html>
`;

const emailText = `
🚨 CI/CD Build Failure: ${workflowName} on ${branch} (${sha})
-------------------------------------------------------------
Repository: ${repo}
Branch: ${branch}
Commit: ${sha}
Triggered by: ${actor}
Run URL: ${runUrl}

A quality gate or compilation step failed. Please inspect the logs immediately:
${runUrl}
`;

async function notifyViaNodemailer() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("ℹ️  SMTP credentials not configured in environment. Skipping direct SMTP dispatch.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"PTW CI/CD Sentinel" <${fromEmail}>`,
      to: alertRecipient,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      headers: {
        "X-Priority": "1",
        "Importance": "high",
        "X-MSMail-Priority": "High"
      }
    });

    console.log(`✅ [Email Alert] Successfully dispatched to ${alertRecipient} (MessageId: ${info.messageId})`);
    return true;
  } catch (err) {
    console.error(`⚠️ [Email Alert Error]: ${err.message}`);
    return false;
  }
}

async function notifyViaResend() {
  if (!process.env.RESEND_API_KEY) {
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `PraveenTechWorld CI <alerts@praveentechworld.com>`,
        to: [alertRecipient],
        subject: emailSubject,
        html: emailHtml,
        text: emailText
      })
    });

    if (res.ok) {
      console.log(`✅ [Resend Alert] Dispatched to ${alertRecipient}`);
      return true;
    } else {
      const err = await res.text();
      console.error(`⚠️ [Resend Alert Failed]: ${err}`);
      return false;
    }
  } catch (err) {
    console.error(`⚠️ [Resend Exception]: ${err.message}`);
    return false;
  }
}

async function notifyViaTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  try {
    const msg = `🚨 *PTW CI/CD Failure Alert*\n\n` +
      `*Workflow:* ${workflowName}\n` +
      `*Branch:* \`${branch}\` (${sha})\n` +
      `*Actor:* ${actor}\n\n` +
      `[View Failure Logs](${runUrl})`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: "Markdown",
        disable_web_page_preview: false
      })
    });

    if (res.ok) {
      console.log("✅ [Telegram Alert] Dispatched to channel.");
      return true;
    }
    return false;
  } catch (err) {
    console.error(`⚠️ [Telegram Alert Error]: ${err.message}`);
    return false;
  }
}

async function createGitHubIssueFallback() {
  const token = process.env.GITHUB_TOKEN;
  if (!token || !process.env.GITHUB_REPOSITORY) {
    console.log("ℹ️  No GITHUB_TOKEN or GITHUB_REPOSITORY available for issue creation.");
    return false;
  }

  try {
    // Check if an open issue already exists for this workflow failure to prevent duplicates
    const searchRes = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=open&labels=ci-failure`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "PTW-CI-Sentinel"
        }
      }
    );

    if (searchRes.ok) {
      const issues = await searchRes.json();
      const existing = issues.find(i => i.title.includes(workflowName));
      if (existing) {
        console.log(`ℹ️ [GitHub Issue] Open failure issue already exists: #${existing.number} (${existing.html_url})`);
        return true;
      }
    }

    const issueBody = `
## 🚨 CI/CD Quality Gate Failure

A failure occurred in the automated CI/CD pipeline.

- **Workflow:** \`${workflowName}\`
- **Branch:** \`${branch}\`
- **Commit:** \`${sha}\`
- **Triggered by:** @${actor}
- **Run ID:** [View Workflow Run #${runId}](${runUrl})

### Recommended Resolution Steps:
1. Review the pre-flight checks locally: \`node src/scripts/ci-preflight-audit.mjs\`
2. Check for TypeScript or component errors: \`npx astro check\`
3. Verify static build compilation: \`npm run build\`
4. Push a fix to branch \`${branch}\` to automatically resolve and close this issue.
`;

    const createRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "PTW-CI-Sentinel"
      },
      body: JSON.stringify({
        title: `🚨 CI/CD Failure: ${workflowName} on ${branch} (${sha})`,
        body: issueBody,
        labels: ["ci-failure", "bug"]
      })
    });

    if (createRes.ok) {
      const issueData = await createRes.json();
      console.log(`✅ [GitHub Issue Created] #${issueData.number}: ${issueData.html_url}`);
      return true;
    } else {
      const errTxt = await createRes.text();
      console.error(`⚠️ [GitHub Issue Create Failed]: ${errTxt}`);
      return false;
    }
  } catch (err) {
    console.error(`⚠️ [GitHub Issue Exception]: ${err.message}`);
    return false;
  }
}

function writeStepSummary() {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;

  const markdown = `
# 🚨 CI/CD Pipeline Failed

| Field | Detail |
|---|---|
| **Workflow** | \`${workflowName}\` |
| **Branch** | \`${branch}\` |
| **Commit** | \`${sha}\` |
| **Actor** | \`${actor}\` |
| **Actions Run** | [Inspect Logs](${runUrl}) |

### Quick Debugging Command:
\`\`\`bash
node src/scripts/ci-preflight-audit.mjs
npm run check
npm run build
\`\`\`
`;

  try {
    fs.appendFileSync(summaryFile, markdown, "utf8");
    console.log("✅ [Step Summary] Written to GITHUB_STEP_SUMMARY.");
  } catch (err) {
    console.error("⚠️ Failed to write step summary:", err.message);
  }
}

async function main() {
  writeStepSummary();

  if (isDryRun) {
    console.log("🧪 DRY-RUN MODE: Simulating alert dispatch...");
    console.log(`Subject: ${emailSubject}`);
    console.log(`Target: ${alertRecipient}`);
    console.log("Text Body Preview:\n", emailText.trim());
    console.log("✅ Dry-run completed successfully.");
    process.exit(0);
  }

  const emailSent = await notifyViaNodemailer();
  const resendSent = !emailSent ? await notifyViaResend() : false;
  await notifyViaTelegram();

  // If external email dispatch was not available, auto-create GitHub issue so GitHub emails the user natively!
  if (!emailSent && !resendSent) {
    await createGitHubIssueFallback();
  }

  console.log("✨ Failure notifier run finished.");
}

main().catch(err => {
  console.error("Fatal notifier error:", err);
  process.exit(0); // Never fail the failure notifier itself
});
