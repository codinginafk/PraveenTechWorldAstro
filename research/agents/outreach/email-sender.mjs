import "dotenv/config";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

let transport = null;

function getTransport() {
  if (transport) return transport;
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transport;
}

export async function sendEmail({ to, subject, text, html }) {
  const from = `"${process.env.OUTREACH_NAME || "Praveen Mishra"}" <${process.env.OUTREACH_EMAIL}>`;
  const t = getTransport();
  try {
    const info = await t.sendMail({ from, to, subject, text, html });
    console.log(`  [Email] Sent to ${to}: ${info.messageId}`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`  [Email] Failed to ${to}: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

export async function sendBulk(recipients) {
  const results = [];
  for (const r of recipients) {
    const res = await sendEmail(r);
    results.push(res);
    await new Promise(r => setTimeout(r, 3000)); // 3s delay between sends
  }
  return results;
}
