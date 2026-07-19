import Database from "better-sqlite3";
import path from "node:path";

const projectRoot = "C:/Users/bunny/Downloads/00Resume/Building_Tech_Website";
const dbPath = path.join(projectRoot, "mission_control.sqlite");

try {
  const db = new Database(dbPath);
  const artifacts = db.prepare("SELECT * FROM artifacts").all();
  console.log("=== ARTIFACTS IN DATABASE ===");
  console.log(JSON.stringify(artifacts, null, 2));
} catch (err) {
  console.error("Failed to query artifacts:", err.message);
}
