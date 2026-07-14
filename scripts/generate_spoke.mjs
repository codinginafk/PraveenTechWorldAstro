import Database from 'better-sqlite3';
import { createArtifact } from './mission_control.mjs';
import readline from "node:readline/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scoutDb = new Database(path.join(__dirname, 'scoutdb.sqlite'));

import fs from 'node:fs';

async function confirmExperienceInteractively(gapText) {
  const answersPath = path.join(__dirname, '..', 'scratch', 'experience_answers.json');
  if (fs.existsSync(answersPath)) {
    const answers = JSON.parse(fs.readFileSync(answersPath, 'utf8'));
    if (answers[gapText] !== undefined) {
      console.log(`Gap: "${gapText}"`);
      console.log(`Can you speak to this from firsthand experience? (y/n): ${answers[gapText] ? 'y' : 'n'}`);
      return answers[gapText];
    }
  }
  
  // Fallback if not in JSON
  return false;
}

async function callOpenRouter(systemPrompt, userPrompt) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tencent/hy3:free",
      max_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function run() {
  console.log("=== Generating Spoke 3 with Experience Gating ===\n");

  // 1. Get the active cluster
  const cluster = scoutDb.prepare("SELECT * FROM clusters WHERE status = 'ACTIVE' LIMIT 1").get();
  if (!cluster) {
    console.error("No active cluster found.");
    return;
  }

  console.log(`Active Cluster: ${cluster.topic_name}`);
  console.log(`Gaps Addressed: ${cluster.gaps_addressed} / ${cluster.gaps_total}`);

  // 2. Fetch the raw gap analysis for this cluster
  const gapAnalysis = scoutDb.prepare("SELECT gap_analysis_raw FROM competitor_analysis WHERE artifact_id = ?").get(cluster.hub_artifact_id);
  
  if (!gapAnalysis) {
    console.error("No gap analysis found for this cluster.");
    return;
  }

  // 3. Use LLM to extract the distinct remaining gaps into a plain list
  console.log("\nExtracting distinct gaps from raw analysis...");
  const extractPrompt = `You are an extraction assistant. Given the following raw gap analysis, extract a list of the distinct content gaps identified.
Return ONLY a plain text bulleted list, one gap per line, starting with a dash (-).
Raw analysis:\n${gapAnalysis.gap_analysis_raw}`;

  let gaps = [];
  try {
    const rawExtraction = await callOpenRouter("You output plain text.", extractPrompt);
    gaps = rawExtraction
      .split('\n')
      .map(line => line.replace(/^- /, '').trim())
      .filter(line => line.length > 0 && !line.toLowerCase().startsWith('here is') && !line.toLowerCase().startsWith('sure'));
  } catch (err) {
    console.error("Failed to parse gaps from LLM:", err.message);
    return;
  }

  if (!Array.isArray(gaps) || gaps.length === 0) {
    console.error("No gaps found.");
    return;
  }

  // 4. Experience Extractor Gate (Interactive)
  console.log(`\nFound ${gaps.length} gaps. Running Experience Extractor Gate...`);
  const validatedGaps = [];
  for (const gap of gaps) {
    const hasExperience = await confirmExperienceInteractively(gap);
    if (hasExperience) {
      validatedGaps.push(gap);
    }
  }

  if (validatedGaps.length === 0) {
    console.error("\nNo gaps passed the experience gate. Cannot generate spoke.");
    return;
  }

  console.log(`\n${validatedGaps.length} gaps validated by firsthand experience.`);

  // 5. Synthesize Title from Validated Gaps
  console.log("\nSynthesizing optimal Spoke title...");
  const synthesizePrompt = `You are a master content strategist. We are creating a sub-article (Spoke) for the cluster topic: "${cluster.topic_name}".
The article MUST address the following validated content gaps that competitors missed:
${validatedGaps.map(g => "- " + g).join("\n")}

Synthesize the most logical, highly-targeted article title and the exact editorial angle.
Return ONLY a valid JSON object:
{
  "title": "The exact article title",
  "editorialAngle": "A 1-2 sentence description of the angle"
}`;

  let titleData;
  try {
    const rawSynthesis = await callOpenRouter("You output strict JSON.", synthesizePrompt);
    const cleaned = rawSynthesis.replace(/^```json\s*|```\s*$/gm, "").trim();
    titleData = JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to synthesize title:", err.message);
    return;
  }

  console.log(`\nSynthesized Title: ${titleData.title}`);
  console.log(`Editorial Angle: ${titleData.editorialAngle}`);

  // 6. Create Artifact
  const id = createArtifact(titleData.title, "B", 0.95);
  console.log(`\nCreated new artifact (Spoke) with ID: ${id}. It is now in the pipeline.`);
}

run().catch(console.error);
