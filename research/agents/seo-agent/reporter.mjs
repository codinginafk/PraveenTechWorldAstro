import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SEO_CONFIG, ROOT_DIR } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.resolve(__dirname, "../../reports");

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
const SEVERITY_COLORS = { CRITICAL: "bg-red-100 text-red-800 border-red-300", HIGH: "bg-orange-100 text-orange-800 border-orange-300", MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-300", LOW: "bg-blue-100 text-blue-800 border-blue-300", INFO: "bg-gray-100 text-gray-800 border-gray-300" };

function severityWeight(s) {
  return SEVERITY_ORDER[s] ?? 99;
}

function computeHealthScore(findings) {
  if (findings.length === 0) return 100;
  const critical = findings.filter((f) => f.severity === "CRITICAL").length;
  const high = findings.filter((f) => f.severity === "HIGH").length;
  const medium = findings.filter((f) => f.severity === "MEDIUM").length;
  const low = findings.filter((f) => f.severity === "LOW").length;

  const score = Math.max(0, Math.min(100,
    100 - (critical * 15) - (high * 8) - (medium * 3) - (low * 1)
  ));
  return { score, critical, high, medium, low };
}

function groupByType(findings) {
  const groups = {};
  for (const f of findings) {
    if (!groups[f.type]) groups[f.type] = { type: f.type, count: 0, severity: f.severity, pages: [] };
    groups[f.type].count++;
    groups[f.type].pages.push(f.page);
  }
  return Object.values(groups).sort((a, b) => severityWeight(a.severity) - severityWeight(b.severity));
}

export function generateHtmlReport(findings, startTime) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const health = computeHealthScore(findings);
  const bySeverity = groupByType(findings);
  const nonInfo = findings.filter((f) => f.severity !== "INFO");

  const severityRows = (sev) => findings
    .filter((f) => f.severity === sev)
    .map((f) => `<tr class="hover:bg-gray-50">
      <td class="px-4 py-2 text-sm font-mono">${f.page}</td>
      <td class="px-4 py-2 text-sm">${f.type}</td>
      <td class="px-4 py-2 text-sm">${f.message}</td>
    </tr>`).join("");

  const sevSections = ["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => {
    const items = findings.filter((f) => f.severity === sev);
    if (items.length === 0) return "";
    return `<div class="mb-8">
      <h2 class="text-xl font-bold mb-3 ${sev === "CRITICAL" ? "text-red-700" : sev === "HIGH" ? "text-orange-700" : sev === "MEDIUM" ? "text-yellow-700" : "text-blue-700"}">${sev} (${items.length})</h2>
      <table class="w-full border-collapse">
        <thead><tr class="bg-gray-100"><th class="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Page</th><th class="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Type</th><th class="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Finding</th></tr></thead>
        <tbody>${severityRows(sev)}</tbody>
      </table>
    </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Technical SEO Audit — PraveenTechWorld</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-900 p-8">
  <div class="max-w-6xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">Technical SEO Audit</h1>
      <p class="text-gray-600">PraveenTechWorld — ${new Date().toISOString().split("T")[0]}</p>
      <p class="text-gray-600">Completed in ${duration}s — ${findings.length} total findings (${health.critical} CRITICAL, ${health.high} HIGH, ${health.medium} MEDIUM, ${health.low} LOW)</p>
    </div>

    <div class="grid grid-cols-5 gap-4 mb-8">
      <div class="bg-white rounded-xl border p-4 text-center">
        <div class="text-3xl font-bold ${health.score >= 80 ? "text-green-600" : health.score >= 60 ? "text-yellow-600" : "text-red-600"}">${health.score}</div>
        <div class="text-sm text-gray-500">Health Score</div>
      </div>
      <div class="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
        <div class="text-3xl font-bold text-red-600">${health.critical}</div>
        <div class="text-sm text-red-700">Critical</div>
      </div>
      <div class="bg-orange-50 rounded-xl border border-orange-200 p-4 text-center">
        <div class="text-3xl font-bold text-orange-600">${health.high}</div>
        <div class="text-sm text-orange-700">High</div>
      </div>
      <div class="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center">
        <div class="text-3xl font-bold text-yellow-600">${health.medium}</div>
        <div class="text-sm text-yellow-700">Medium</div>
      </div>
      <div class="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
        <div class="text-3xl font-bold text-blue-600">${health.low}</div>
        <div class="text-sm text-blue-700">Low</div>
      </div>
    </div>

    <div class="bg-white rounded-xl border p-6 mb-8">
      <h2 class="text-xl font-bold mb-4">By Category</h2>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead><tr class="bg-gray-100"><th class="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Category</th><th class="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Count</th><th class="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Severity</th><th class="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Affected Pages</th></tr></thead>
          <tbody>${bySeverity.map((g) => `<tr class="border-t hover:bg-gray-50">
            <td class="px-4 py-2 text-sm font-mono">${g.type}</td>
            <td class="px-4 py-2 text-sm">${g.count}</td>
            <td class="px-4 py-2 text-sm"><span class="inline-block px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[g.severity] || "bg-gray-100"}">${g.severity}</span></td>
            <td class="px-4 py-2 text-sm text-gray-500 truncate max-w-xs">${g.pages.slice(0, 5).join(", ")}${g.pages.length > 5 ? `, +${g.pages.length - 5} more` : ""}</td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </div>

    ${sevSections}

    <div class="mt-8 text-center text-xs text-gray-400">
      Generated by PraveenTechWorld Technical SEO Agent &mdash; ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;

  return html;
}

export function generateMarkdownReport(findings, startTime) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const health = computeHealthScore(findings);
  const lines = [
    "# Technical SEO Audit Report",
    "",
    `**Site:** ${SEO_CONFIG.siteUrl}`,
    `**Date:** ${new Date().toISOString().split("T")[0]}`,
    `**Duration:** ${duration}s`,
    `**Total Findings:** ${findings.length}`,
    "",
    "## Health Score",
    "",
    `**${health.score}/100** — ${health.critical} CRITICAL, ${health.high} HIGH, ${health.medium} MEDIUM, ${health.low} LOW`,
    "",
  ];

  for (const sev of ["CRITICAL", "HIGH", "MEDIUM", "LOW"]) {
    const items = findings.filter((f) => f.severity === sev);
    if (items.length === 0) continue;
    lines.push(`## ${sev} (${items.length})`);
    lines.push("");
    for (const f of items) {
      lines.push(`- **${f.page}** — ${f.type}: ${f.message}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`*Generated by Technical SEO Agent — ${new Date().toISOString()}*`);
  lines.push("");

  return lines.join("\n");
}

export function saveReport(html, markdown) {
  const dir = path.join(REPORTS_DIR, "seo-audit");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  const htmlPath = path.join(dir, `seo-audit-${timestamp}.html`);
  fs.writeFileSync(htmlPath, html, "utf-8");

  const mdPath = path.join(dir, `seo-audit-${timestamp}.md`);
  fs.writeFileSync(mdPath, markdown, "utf-8");

  // Also write latest copies
  const latestHtml = path.join(dir, "seo-audit-latest.html");
  fs.writeFileSync(latestHtml, html, "utf-8");

  const latestMd = path.join(dir, "seo-audit-latest.md");
  fs.writeFileSync(latestMd, markdown, "utf-8");

  return { htmlPath, mdPath, latestHtml, latestMd };
}

export { computeHealthScore };
