import fs from "fs";
import { fileURLToPath } from "url";
import { EMAIL_TARGETS, AUTHOR_NAME } from "./targets.mjs";
import { generatePitch } from "./pitch-generator.mjs";
import { sendEmail } from "./email-sender.mjs";
import { logSent, getStatus, TRACKER_FILE } from "./tracker.mjs";

const BATCH_SIZE = 5; // how many to send per run

async function sendPitch(target) {
  const { text, article } = generatePitch(target);

  const subject = `Pitch: ${target.pitchAngle}`;
  const result = await sendEmail({
    to: target.email,
    subject,
    text,
  });

  if (result.ok) {
    logSent(target, { article });
  } else {
    console.error(`  Failed to send pitch to ${target.name}: ${result.error}`);
  }
  return result;
}

export async function runBatch(batchSize = BATCH_SIZE) {
  console.log(`=== Outreach Agent ===`);
  console.log(`Sending to ${batchSize} targets this run`);

  // Get unsent targets (those without email in tracker)
  const status = getStatus();
  const targets = EMAIL_TARGETS.filter(t => t.email); // only those with email known
  const unsent = targets.slice(status.sent, status.sent + batchSize);

  if (unsent.length === 0) {
    console.log("All targets sent! (or no targets with known emails)");
    return { sent: 0 };
  }

  console.log(`Targets this batch: ${unsent.map(t => t.name).join(", ")}`);

  let sent = 0;
  for (const target of unsent) {
    console.log(`\n--- ${target.name} (${target.email}) ---`);
    const result = await sendPitch(target);
    if (result.ok) sent++;
    await new Promise(r => setTimeout(r, 5000)); // 5s between sends
  }

  console.log(`\nDone. ${sent}/${unsent.length} sent this batch.`);
  return { sent };
}

export async function showStatus() {
  const status = getStatus();
  const total = EMAIL_TARGETS.filter(t => t.email).length;
  console.log(`\n=== Outreach Status ===`);
  console.log(`Total EMAIL targets: ${EMAIL_TARGETS.length}`);
  console.log(`With known emails: ${total}`);
  console.log(`Sent: ${status.sent}`);
  console.log(`Accepted: ${status.accepted}`);
  console.log(`Rejected: ${status.rejected}`);
  console.log(`Remaining: ${total - status.sent}`);
  return status;
}

export async function sendFollowUps() {
  const content = fs.readFileSync(TRACKER_FILE, "utf-8");
  const sections = content.split("## ").filter(Boolean);
  let sent = 0;

  for (const section of sections) {
    if (section.includes("Status: SENT") && section.includes("Follow-up: pending")) {
      const name = section.split("\n")[0].trim();
      const urlMatch = section.match(/URL:\s*(\S+)/);
      const emailMatch = section.match(/Email:\s*(\S+)/);
      const topicMatch = section.match(/Pitch Topic:\s*(.+)/);

      if (!emailMatch) continue;

      const target = EMAIL_TARGETS.find(t => t.name === name);
      if (!target) continue;

      console.log(`\n--- Follow-up: ${name} ---`);
      const followUp = `Hi ${name} Team,

Just following up on my previous pitch. I'd be happy to adjust the topic or approach if your current content priorities have shifted.

Would you like me to send a draft for review?

Best regards,
${AUTHOR_NAME}`;

      const result = await sendEmail({
        to: emailMatch[1],
        subject: `Re: Pitch: ${target.pitchAngle}`,
        text: followUp,
      });

      if (result.ok) {
        // Update tracker
        const updated = content.replace(
          `## ${name}\n- **URL:** ${urlMatch ? urlMatch[1] : ""}\n- **Email:** ${emailMatch[1]}\n- **Date:** ${section.match(/Date:\s*(\S+)/)?.[1] || ""}\n- **Pitch Topic:** ${topicMatch ? topicMatch[1].trim() : ""}\n- **Status:** SENT\n- **Follow-up:** pending`,
          `## ${name}\n- **URL:** ${urlMatch ? urlMatch[1] : ""}\n- **Email:** ${emailMatch[1]}\n- **Date:** ${section.match(/Date:\s*(\S+)/)?.[1] || ""}\n- **Pitch Topic:** ${topicMatch ? topicMatch[1].trim() : ""}\n- **Status:** SENT\n- **Follow-up:** done`
        );
        fs.writeFileSync(TRACKER_FILE, updated);
        sent++;
      }
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  console.log(`\nFollow-ups sent: ${sent}`);
  return { sent };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] || "batch";
  if (cmd === "batch") {
    const count = parseInt(process.argv[3] || "5");
    runBatch(count).catch(console.error);
  } else if (cmd === "status") {
    showStatus().catch(console.error);
  } else if (cmd === "followup") {
    sendFollowUps().catch(console.error);
  } else {
    console.log("Usage: node outreach-agent.mjs [batch|status|followup] [count]");
  }
}
