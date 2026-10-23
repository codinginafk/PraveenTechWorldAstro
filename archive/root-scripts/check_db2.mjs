import { getDb } from './scripts/scoutdb.mjs';

async function checkDb() {
    const db = await getDb();
    const cols = await db.all("PRAGMA table_info(artifacts)");
    console.table(cols);
}

checkDb().catch(console.error);
