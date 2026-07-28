import fs from "fs";
import path from "path";

const reportDir = "research/reports/screamingfrog";
const internalAllFile = path.join(reportDir, "internal_all.csv");

console.log("=== DEEP SCREAMING FROG AUDIT PARSER ===");

if (!fs.existsSync(internalAllFile)) {
  console.error("Missing internal_all.csv!");
  process.exit(1);
}

const content = fs.readFileSync(internalAllFile, "utf8");
const lines = content.split("\n").filter(l => l.trim().length > 0);
const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());

const rows = [];
for (let i = 1; i < lines.length; i++) {
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
    const cleanHeader = h.replace(/^"|"$/g, "").trim();
    const cleanVal = (values[idx] || "").replace(/^"|"$/g, "").trim();
    rowObj[cleanHeader] = cleanVal;
  });
  rows.push(rowObj);
}

console.log(`Parsed ${rows.length} internal URLs.`);

const issues = {
  titleTooLong: [],
  metaDescTooLong: [],
  missingH1: [],
  multipleH1: [],
  imagesMissingAlt: [],
  canonicalMismatch: []
};

rows.forEach(r => {
  const url = r["Address"] || r["URL"] || "";
  const contentType = r["Content Type"] || "";
  const statusCode = r["Status Code"] || "";

  if (contentType.includes("html") && statusCode === "200") {
    const title = r["Title 1"] || "";
    const metaDesc = r["Meta Description 1"] || "";
    const h1_1 = r["H1-1"] || "";
    const h1_2 = r["H1-2"] || "";
    const canonical = r["Canonical Link Element 1"] || "";

    if (title.length > 60) {
      issues.titleTooLong.push({ url, title, length: title.length });
    }

    if (metaDesc.length > 160) {
      issues.metaDescTooLong.push({ url, metaDesc, length: metaDesc.length });
    }

    if (!h1_1) {
      issues.missingH1.push({ url });
    } else if (h1_2) {
      issues.multipleH1.push({ url, h1_1, h1_2 });
    }

    if (canonical && canonical !== url) {
      issues.canonicalMismatch.push({ url, canonical });
    }
  }
});

console.log(`\n--- AUDIT RESULTS ---`);
console.log(`Titles > 60 chars: ${issues.titleTooLong.length}`);
console.log(`Meta Descriptions > 160 chars: ${issues.metaDescTooLong.length}`);
console.log(`Missing H1s: ${issues.missingH1.length}`);
console.log(`Multiple H1s: ${issues.multipleH1.length}`);
console.log(`Canonical Mismatches: ${issues.canonicalMismatch.length}`);

console.log(`\n--- TOP 10 TITLES > 60 CHARS ---`);
issues.titleTooLong.slice(0, 10).forEach(item => {
  console.log(`  - [${item.length} chars] ${item.url}`);
  console.log(`    Title: "${item.title}"`);
});

console.log(`\n--- TOP 10 META DESCRIPTIONS > 160 CHARS ---`);
issues.metaDescTooLong.slice(0, 10).forEach(item => {
  console.log(`  - [${item.length} chars] ${item.url}`);
  console.log(`    Desc: "${item.metaDesc}"`);
});

fs.writeFileSync("research/reports/screamingfrog_deep_audit.json", JSON.stringify(issues, null, 2));
