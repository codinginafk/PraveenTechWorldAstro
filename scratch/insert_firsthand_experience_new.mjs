import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mcDb = new Database(path.join(__dirname, '..', 'mission_control.sqlite'));

const experiences = [
  {
    artifactId: 16,
    evidenceRef: 'EV-FIRSTHAND-M365',
    title: 'Firsthand Incident: M365 Device-Code Flow Phishing Lure Detection',
    summary: 'I observed this in our tenant last week when a user was prompted with a device login code for a "Document Sharing" app. I audited the Entra ID (Azure AD) sign-in logs, tracked the request to a malicious tenant, revoked the user sessions, and disabled device-code flow via conditional access.',
    sourceUrl: 'firsthand://m365-device-code-incident'
  },
  {
    artifactId: 17,
    evidenceRef: 'EV-FIRSTHAND-DOCKER',
    title: 'Firsthand Case Study: Migrating 120 Developers from Docker Desktop to Podman',
    summary: 'We ran into the new Docker Desktop license threshold (exceeding 250 employees) at our firm last month. We successfully migrated 120 developers to Podman and Rancher Desktop, documenting the environment variable mappings, file sharing setups, and docker-compose wrappers.',
    sourceUrl: 'firsthand://docker-desktop-migration'
  }
];

for (const exp of experiences) {
  // Check if firsthand already exists
  const existing = mcDb.prepare("SELECT * FROM evidence WHERE artifact_id = ? AND source_type = 'firsthand'").get(exp.artifactId);
  if (existing) {
    console.log(`Firsthand experience already exists for artifact ID ${exp.artifactId}.`);
    continue;
  }

  // Insert into evidence
  mcDb.prepare(
    `INSERT INTO evidence (artifact_id, evidence_ref, source_url, source_type, title, confidence, content_hash) 
     VALUES (?, ?, ?, 'firsthand', ?, 100, ?)`
  ).run(
    exp.artifactId,
    exp.evidenceRef,
    exp.sourceUrl,
    exp.title,
    'hash_' + exp.evidenceRef
  );
  console.log(`Inserted firsthand experience for artifact ID ${exp.artifactId}.`);
}

console.log("Firsthand experience setup complete.");
