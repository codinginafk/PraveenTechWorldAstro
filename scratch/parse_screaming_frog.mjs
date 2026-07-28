import fs from "fs";
import path from "path";

const reportDir = "research/reports/screamingfrog";

console.log("=== SCREAMING FROG AUDIT PARSER ===");

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter(l => l.trim().length > 0);
  if (lines.length <= 1) return [];

  // Parse header
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parser handling quotes
    const line = lines[i];
    const values = [];
    let insideQuote = false;
    let currentVal = "";

    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        values.push(currentVal.replace(/^"|"$/g, "").trim());
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.replace(/^"|"$/g, "").trim());

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || "";
    });
    rows.push(rowObj);
  }
  return rows;
}

const clientErrors = parseCSV(path.join(reportDir, "response_codes_client_error_(4xx).csv"));
const redirects = parseCSV(path.join(reportDir, "response_codes_redirection_(3xx).csv"));
const noindexDirectives = parseCSV(path.join(reportDir, "directives_noindex.csv"));
const internalAll = parseCSV(path.join(reportDir, "internal_all.csv"));

console.log(`\n--- SCREAMING FROG CRAWL SUMMARY ---`);
console.log(`Total Internal URLs Crawled: ${internalAll.length}`);
console.log(`4xx Client Errors: ${clientErrors.length}`);
console.log(`3xx Redirection URLs: ${redirects.length}`);
console.log(`Noindex Directives: ${noindexDirectives.length}`);

console.log(`\n--- 4XX CLIENT ERRORS ---`);
clientErrors.forEach((row, i) => {
  console.log(`  [${i + 1}] URL: ${row["Address"] || row["URL"]}`);
  console.log(`      Status Code: ${row["Status Code"]}`);
  console.log(`      Source Inlinks: ${row["Inlinks"] || "N/A"}`);
});

console.log(`\n--- NOINDEX DIRECTIVES ---`);
noindexDirectives.forEach((row, i) => {
  console.log(`  [${i + 1}] URL: ${row["Address"] || row["URL"]}`);
  console.log(`      Meta Robots: ${row["Meta Robots 1"] || row["Indexability"]}`);
});

// Check meta title / description issues from internalAll
const titleMissing = internalAll.filter(r => (r["HTML"] || r["Content Type"] || "").includes("html") && !r["Title 1"]);
const metaDescMissing = internalAll.filter(r => (r["HTML"] || r["Content Type"] || "").includes("html") && !r["Meta Description 1"]);

console.log(`\nMissing Title Tags: ${titleMissing.length}`);
console.log(`Missing Meta Descriptions: ${metaDescMissing.length}`);

// Save summary report
const summary = {
  clientErrors,
  redirects,
  noindexDirectives,
  missingTitles: titleMissing.map(r => r["Address"] || r["URL"]),
  missingMetaDescriptions: metaDescMissing.map(r => r["Address"] || r["URL"])
};

fs.writeFileSync("research/reports/screamingfrog_audit_summary.json", JSON.stringify(summary, null, 2));
console.log("\nFull Screaming Frog analysis saved to research/reports/screamingfrog_audit_summary.json");
