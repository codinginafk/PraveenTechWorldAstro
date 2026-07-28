import fs from "fs";
import path from "path";

const reportDir = "research/reports/screamingfrog";

function readCSV(filename) {
  const file = path.join(reportDir, filename);
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n").filter(l => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map(line => {
    const parts = line.split(",");
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (parts[idx] || "").replace(/^"|"$/g, "").trim();
    });
    return obj;
  });
}

console.log("=== 4XX CLIENT ERRORS FROM SCREAMING FROG ===");
const clientErrors = readCSV("response_codes_client_error_(4xx).csv");
console.log(clientErrors);

console.log("\n=== 3XX REDIRECTS FROM SCREAMING FROG (Top 20) ===");
const redirects = readCSV("response_codes_redirection_(3xx).csv");
redirects.slice(0, 20).forEach(r => {
  console.log(`Source: ${r.Address || r.URL} -> Redirect: ${r["Redirect URL"] || r.Destination || "N/A"}`);
});
