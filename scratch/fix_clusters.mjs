import Database from 'better-sqlite3';
const mcDb = new Database('mission_control.sqlite');
const scoutDb = new Database('scripts/scoutdb.sqlite');

try {
  mcDb.exec("ALTER TABLE artifacts ADD COLUMN cluster_id INTEGER");
  mcDb.exec("ALTER TABLE artifacts ADD COLUMN cluster_role TEXT");
} catch(e) {
  console.log("Columns may already exist");
}

mcDb.prepare("UPDATE artifacts SET cluster_id = 2, cluster_role = 'SPOKE' WHERE id IN (1, 2, 3)").run();

scoutDb.prepare("UPDATE clusters SET spokes_published = 3 WHERE id = 2").run();

console.log("Fixed artifacts schema and updated cluster 2 spokes count to 3");
