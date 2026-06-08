import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { log, ensureDir } from "../lib/shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runAudit() {
  const startTime = Date.now();
  log("[SEO Agent] Starting full technical SEO audit...");

  const { runSitemapValidation } = await import("./sitemap-validator.mjs");
  const { runPageAudit } = await import("./page-auditor.mjs");
  const { runContentAudit } = await import("./content-auditor.mjs");
  const { runImageAudit } = await import("./image-auditor.mjs");
  const { runLinkAnalysis } = await import("./link-analyzer.mjs");
  const { runSchemaValidation } = await import("./schema-validator.mjs");
  const { generateHtmlReport, generateMarkdownReport, saveReport } = await import("./reporter.mjs");

  log("[SEO Agent] Running sitemap validation...");
  const sitemapFindings = await runSitemapValidation();

  log("[SEO Agent] Running page audit...");
  const pageFindings = await runPageAudit();

  log("[SEO Agent] Running content audit...");
  const contentFindings = await runContentAudit();

  log("[SEO Agent] Running image audit...");
  const imageFindings = await runImageAudit();

  log("[SEO Agent] Running link analysis...");
  const linkFindings = await runLinkAnalysis();

  log("[SEO Agent] Running schema validation...");
  const schemaFindings = await runSchemaValidation();

  log("[SEO Agent] Running Screaming Frog crawl...");
  const { runScreamingFrogAudit } = await import("./screaming-frog.mjs");
  const sfResult = await runScreamingFrogAudit();
  const sfFindings = sfResult?.findings || [];
  log(`[SEO Agent] Screaming Frog found ${sfFindings.length} issues`);

  const allFindings = [
    ...sitemapFindings,
    ...pageFindings,
    ...contentFindings,
    ...imageFindings,
    ...linkFindings,
    ...schemaFindings,
  ];

  // Sort by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  allFindings.sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));

  // Generate reports
  log("[SEO Agent] Generating reports...");
  const html = generateHtmlReport(allFindings, startTime);
  const markdown = generateMarkdownReport(allFindings, startTime);
  const paths = saveReport(html, markdown);

  // Summary
  const critical = allFindings.filter((f) => f.severity === "CRITICAL").length;
  const high = allFindings.filter((f) => f.severity === "HIGH").length;
  const medium = allFindings.filter((f) => f.severity === "MEDIUM").length;
  const low = allFindings.filter((f) => f.severity === "LOW").length;

  log("=" .repeat(50));
  log("[SEO Agent] Audit Complete!");
  log(`  Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  log(`  Total findings: ${allFindings.length}`);
  log(`  CRITICAL: ${critical}`);
  log(`  HIGH:     ${high}`);
  log(`  MEDIUM:   ${medium}`);
  log(`  LOW:      ${low}`);
  log(`  Report:   ${paths.htmlPath}`);
  log(`  Latest:   ${paths.latestHtml}`);
  log("=" .repeat(50));

  return { findings: allFindings, paths };
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAudit().catch((err) => {
    console.error("[SEO Agent] Fatal error:", err);
    process.exit(1);
  });
}

export { runAudit };
