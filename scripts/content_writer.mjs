/**
 * content_writer.mjs
 * ============================================================
 * The Content Division: Triad Writers + Experience Extractor
 * 
 * Three isolated, specialized agents write different sections.
 * Each agent receives a FROZEN, read-only evidence dossier.
 * Agents never share context with each other (no groupthink).
 * Mission Control merges the outputs.
 * ============================================================
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './scoutdb.mjs';
import { transition, STATES, logFailure } from './mission_control.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.resolve(__dirname, '../drafts');

// ─── Shared LLM caller ────────────────────────────────────────────────────────

async function callLLM(systemPrompt, userContent, model = 'openai/gpt-4o-mini') {
    const dotenv = await import('dotenv');
    dotenv.config();
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new Error('LLM_API_KEY missing in .env');

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userContent }
            ]
        })
    });

    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content.trim();
}

// ─── Experience Extractor ─────────────────────────────────────────────────────
// Surfaces a targeted question to the human author before any writing begins.
// If author_experience is null, writing is blocked until answered.

export async function runExperienceExtractor(artifactId) {
    const db = await getDb();
    const artifact = await db.get(`SELECT * FROM artifacts WHERE id = ?`, [artifactId]);
    
    // If experience already provided, skip
    if (artifact?.author_exp) {
        console.log(`[ExperienceExtractor] Experience already recorded for "${artifact.title}". Skipping.`);
        return JSON.parse(artifact.author_exp);
    }

    const evidence = await db.all(
        `SELECT title, summary, source_domain FROM evidence WHERE topic_id IN (
            SELECT id FROM topics WHERE title = ?
         ) LIMIT 5`,
        [artifact.title]
    );

    const evidenceSummary = evidence.map(e => `- [${e.source_domain}] ${e.title}: ${e.summary}`).join('\n');

    const question = await callLLM(
        `You are the Experience Extractor for a personal IT blog.
Your author has run enterprise infrastructure for 700+ users across 35+ branches in the UAE, Bahrain, and India.
They use Python automation, Active Directory, Cisco networking, Microsoft Dynamics GP, and AI orchestration.
Based on the topic and its evidence, generate ONE highly specific question to ask the author about their personal experience.
The question must be answerable with concrete details: error messages, commands, specific tools, dates, user counts.
Return only the question, nothing else.`,
        `Topic: ${artifact.title}\nEvidence:\n${evidenceSummary}`
    );

    console.log(`\n[ExperienceExtractor] ❓ Author Input Required for: "${artifact.title}"`);
    console.log(`\n  QUESTION: ${question}\n`);
    console.log(`  (Add your answer to the artifact via: node scripts/content_writer.mjs answer ${artifactId} "your answer here")\n`);

    // Store the pending question
    await db.run(
        `UPDATE artifacts SET author_exp = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [JSON.stringify({ status: 'pending', question }), artifactId]
    );

    return { status: 'pending', question };
}

// ─── Architecture Writer ──────────────────────────────────────────────────────

async function architectureWriter(topic, evidence, outline) {
    console.log(`[Writer/Architecture] Writing architecture section...`);
    return callLLM(
        `You are the Architecture Writer — an elite IT Operations Architect.
RULES:
- Write ONLY about: why this technology exists, its design decisions, tradeoffs, and limitations.
- Do NOT write setup steps, commands, or troubleshooting. Those are handled by other writers.
- Use a peer-to-peer voice. Assume the reader is a competent IT engineer, not a student.
- Ban: "delve", "robust", "seamless", "leverage", "utilize", "in conclusion".
- Every architectural claim must be traceable to the evidence provided.
- Maximum 400 words. Markdown format.`,
        `Topic: ${topic}\nEvidence:\n${evidence}\nOutline Section: ${outline}`
    );
}

// ─── Implementation Writer ────────────────────────────────────────────────────

async function implementationWriter(topic, evidence, outline, authorExperience) {
    console.log(`[Writer/Implementation] Writing implementation section...`);
    return callLLM(
        `You are the Implementation Writer — a hands-on systems engineer.
RULES:
- Write ONLY about: exact commands, configuration snippets, setup steps, version numbers.
- Every command must include the tested software version.
- Use fenced code blocks with the correct language tag.
- Do NOT invent commands or output. Only use what is in the evidence.
- Do NOT write about architecture or troubleshooting.
- Ban all fluff words. Be direct and terse.
- Maximum 500 words. Markdown format.`,
        `Topic: ${topic}\nEvidence:\n${evidence}\nAuthor experience: ${authorExperience || 'None provided.'}\nOutline Section: ${outline}`
    );
}

// ─── Troubleshooting Writer ───────────────────────────────────────────────────

async function troubleshootingWriter(topic, evidence, outline, authorExperience) {
    console.log(`[Writer/Troubleshooting] Writing troubleshooting section...`);
    return callLLM(
        `You are the Troubleshooting Writer — a battle-hardened incident responder.
RULES:
- Write ONLY about: what breaks, real error messages, root causes, and fixes.
- Each failure scenario must use this structure: Error → Root Cause → Fix → Verify.
- If the author has personal experience (provided below), use their exact details — never invent.
- If no author experience is provided for a scenario, write "Author note pending" as a placeholder.
- Do NOT write about architecture or standard setup steps.
- Ban: "simply", "just", "easy", "straightforward".
- Maximum 400 words. Markdown format.`,
        `Topic: ${topic}\nEvidence:\n${evidence}\nAuthor personal experience: ${authorExperience || 'Not yet provided. Mark scenarios as pending.'}\nOutline Section: ${outline}`
    );
}

// ─── Outline Planner ─────────────────────────────────────────────────────────

async function outlinePlanner(topic, evidence, editorialAngle) {
    console.log(`[Writer/Planner] Generating article outline...`);
    const outline = await callLLM(
        `You are the Outline Planner for a technical IT blog.
Generate a structured article outline that covers: What, Why, How, Troubleshooting, Alternatives.
For each section, specify which writer should handle it: [Architecture], [Implementation], or [Troubleshooting].
Also specify 1-2 visual aids needed (diagram, CLI screenshot, comparison table).
Return as clean Markdown with section headers.`,
        `Topic: ${topic}\nEditorial angle: ${editorialAngle}\nEvidence:\n${evidence}`
    );
    return outline;
}

// ─── Merge & Assemble Final Draft ────────────────────────────────────────────

async function mergeDraft(artifact, archSection, implSection, troubleSection, outline) {
    console.log(`[Writer/Merge] Assembling final draft...`);
    
    const today = new Date().toISOString().split('T')[0];
    const slug  = artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);

    const frontmatter = `---
title: "${artifact.title}"
description: "TODO: Write a 155-character meta description."
pubDate: ${today}
tags: []
draft: true
---

`;
    const body = `## Overview\n*Editorial Angle: ${artifact.editorial_angle || 'N/A'}*\n\n${archSection}\n\n${implSection}\n\n${troubleSection}`;
    
    return frontmatter + body;
}

// ─── Main Writer Pipeline ─────────────────────────────────────────────────────

export async function runContentWriter(artifactId) {
    const db = await getDb();
    const artifact = await db.get(`SELECT * FROM artifacts WHERE id = ?`, [artifactId]);
    
    if (!artifact) throw new Error(`Artifact not found: ${artifactId}`);
    
    // Accept OUTLINE state — auto-transition to WRITING
    if (artifact.fsm_state === STATES.OUTLINE) {
        console.log(`[Writer] Artifact in OUTLINE state — transitioning to WRITING.`);
        await transition(artifactId, STATES.WRITING, 'Auto-transitioned from OUTLINE by content writer');
        artifact.fsm_state = STATES.WRITING;
    }
    
    if (artifact.fsm_state !== STATES.WRITING) {
        console.warn(`[Writer] Artifact "${artifact.title}" is in state "${artifact.fsm_state}", not WRITING. Skipping.`);
        return;
    }

    // Check experience extractor
    const exp = artifact.author_exp ? JSON.parse(artifact.author_exp) : null;
    if (!exp || exp.status === 'pending') {
        console.log(`[Writer] ⏸️  Blocked: Experience Extractor awaiting author input for "${artifact.title}".`);
        await runExperienceExtractor(artifactId);
        return;
    }

    const authorExperience = exp.answer || '';

    // Gather evidence dossier (frozen — agents only read this)
    const evidenceRows = await db.all(
        `SELECT source_domain, title, summary, weight 
         FROM evidence 
         WHERE topic_id IN (SELECT id FROM topics WHERE title = ?)
         ORDER BY weight DESC LIMIT 10`,
        [artifact.title]
    );
    const evidenceDossier = evidenceRows
        .map(e => `[${e.source_domain} w:${e.weight}] ${e.title}: ${e.summary}`)
        .join('\n');

    try {
        // Step 1: Generate outline
        const outline = await outlinePlanner(artifact.title, evidenceDossier, artifact.editorial_angle || '');
        await db.run(`UPDATE artifacts SET outline = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [outline, artifactId]);

        // Step 2: Run three isolated writers in parallel (they share evidence but NOT each other's output)
        const [archSection, implSection, troubleSection] = await Promise.all([
            architectureWriter(artifact.title, evidenceDossier, outline),
            implementationWriter(artifact.title, evidenceDossier, outline, authorExperience),
            troubleshootingWriter(artifact.title, evidenceDossier, outline, authorExperience)
        ]);

        // Step 3: Merge into final draft
        const fullDraft = await mergeDraft(artifact, archSection, implSection, troubleSection, outline);

        // Step 4: Write frozen draft to disk
        await fs.mkdir(DRAFTS_DIR, { recursive: true });
        const draftPath = path.join(DRAFTS_DIR, `${artifactId}.mdx`);
        await fs.writeFile(draftPath, fullDraft, 'utf-8');
        
        await db.run(
            `UPDATE artifacts SET draft_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [draftPath, artifactId]
        );

        // Step 5: Transition to REVIEWING
        await transition(artifactId, STATES.REVIEWING, 'Triad writers completed. Draft frozen.');

        console.log(`\n[Writer] ✅ Draft written to: ${draftPath}`);
        console.log(`[Writer] Next step: node scripts/content_writer.mjs review ${artifactId}`);

    } catch (e) {
        console.error(`[Writer] ❌ Error writing draft:`, e.message);
        await logFailure(artifactId, 'content_writer', e.message, artifact.title);
    }
}

// ─── CLI Entry Point ──────────────────────────────────────────────────────────

if (process.argv[1] === import.meta.url || process.argv[1].endsWith('content_writer.mjs')) {
    const [,, action, artifactId, ...rest] = process.argv;

    (async () => {
        if (!action || !artifactId) {
            console.log('Usage:');
            console.log('  node scripts/content_writer.mjs write <artifactId>');
            console.log('  node scripts/content_writer.mjs answer <artifactId> "your experience answer"');
            return;
        }

        if (action === 'write') {
            await runContentWriter(artifactId);
        } else if (action === 'answer') {
            const answer = rest.join(' ');
            const db = await getDb();
            const artifact = await db.get(`SELECT * FROM artifacts WHERE id = ?`, [artifactId]);
            const exp = artifact?.author_exp ? JSON.parse(artifact.author_exp) : {};
            exp.status = 'answered';
            exp.answer = answer;
            await db.run(
                `UPDATE artifacts SET author_exp = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [JSON.stringify(exp), artifactId]
            );
            console.log(`[Writer] ✅ Experience recorded. Run: node scripts/content_writer.mjs write ${artifactId}`);
        }
    })().catch(console.error);
}
