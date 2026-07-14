/**
 * content_scorer.mjs
 * ============================================================
 * The 20-Point Editorial Gatekeeper.
 * Grades drafts against a strict rubric. Rejects anything
 * below 12/20 or that fails any CRITICAL check.
 * ============================================================
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runScorer(filePath) {
    console.log(`\n==========================================`);
    console.log(`[Content Scorer] Analyzing draft: ${path.basename(filePath)}`);
    
    let content;
    try {
        content = await fs.readFile(filePath, 'utf-8');
    } catch (e) {
        console.error(`Error reading file ${filePath}:`, e.message);
        return { approved: false, total_score: 0, feedback: ['File not found'] };
    }

    const dotenv = await import('dotenv');
    dotenv.config();

    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
        console.warn("WARNING: LLM_API_KEY missing.");
        return { approved: false, total_score: 0, feedback: ['No API key'] };
    }

    const prompt = `
You are the final Editorial Gatekeeper for PraveenTechWorld, an Enterprise IT Blog.
Your job is to strictly grade the following markdown draft based on a 20-point checklist.

Score the article from 0 to 2 for each of the following 10 criteria (Total Max = 20 points).
0 = Failed/Generic, 1 = Partial, 2 = Perfect Execution.

CRITERIA:
1. Original Artifacts (CRITICAL): 0=None, 1=1-2 screenshots, 2=3+ original artifacts (logs, commands, real numbers).
2. Documented Failure (CRITICAL): 0="This worked", 1=Mentions a minor hurdle, 2=Deeply details what broke.
3. Claim Traceability (CRITICAL): 0=Bold unsourced claims, 1=Some sources, 2=Every non-obvious claim sourced to official docs/logs.
4. Fabrication Check (CRITICAL): 0=Any terminal command, script, or config path lacks a direct markdown link to official docs or explicit author mapping (AUTOMATIC FAIL), 2=Every technical snippet is verifiable via provided links or explicit author notes.
5. Answer-First Structure: 0=Buries the lede, 1=Partially buried, 2=First 2-3 sentences of sections give the answer.
6. Subtopic Coverage: 0=Keyword stuffing, 1=Answers some follow-ups, 2=Anticipates what a competent reader would ask next.
7. Redundancy: 0=Heavy overlap with common knowledge, 1=Some overlap, 2=Completely unique angle.
8. Visual Aid: 0=Text only, 1=Generic stock photo, 2=Procedural diagram or specific screenshot.
9. Freshness: 0=Outdated info, 1=Recent but generic, 2=Includes specific version numbers/dates.
10. Linkability: 0=Nothing worth citing, 1=Decent summary, 2=Contains a unique stat, tool, or dataset to cite.

Return a strict JSON object with your analysis:
{
  "total_score": 18,
  "breakdown": {
    "original_artifacts": 2,
    "documented_failure": 2,
    "claim_traceability": 2,
    "fabrication_check": 2,
    "answer_first": 2,
    "subtopic_coverage": 2,
    "redundancy": 2,
    "visual_aid": 2,
    "freshness": 2,
    "linkability": 2
  },
  "feedback": [
    "You scored 0 on Visual Aid. Add a screenshot of the Azure dashboard."
  ],
  "approved": true
}

Rules for "approved":
- Must score >= 12 total
- Must score >= 1 on ALL four CRITICAL criteria (original_artifacts, documented_failure, claim_traceability, fabrication_check)
- If fabrication_check is 0, article is AUTOMATICALLY REJECTED regardless of total score

DRAFT CONTENT:
${content}
`;

    try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "tencent/hy3:free",
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await res.json();
        
        if (data.error) {
            throw new Error(`OpenRouter API Error: ${data.error.message || JSON.stringify(data.error)}`);
        }
        if (!data.choices || !data.choices[0]) {
            throw new Error(`Unexpected API response: ${JSON.stringify(data)}`);
        }

        let jsonStr = data.choices[0].message.content.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');

        const evaluation = JSON.parse(jsonStr);
        
        console.log(`\n[Score] ${evaluation.total_score} / 20`);
        console.log(`[Status] ${evaluation.approved ? '🟢 APPROVED FOR PUBLISHING' : '🔴 REJECTED'}`);
        console.log(`\n[Feedback from Gatekeeper]:`);
        evaluation.feedback.forEach(f => console.log(`- ${f}`));
        console.log(`\n[Score Breakdown]:`, evaluation.breakdown);

        return evaluation;

    } catch (e) {
        console.error(`[Error evaluating draft]:`, e.message);
        return { approved: false, total_score: 0, feedback: [e.message] };
    }
}

// Run if a file path is passed as an argument
const targetFile = process.argv[2];
if (targetFile && process.argv[1]?.endsWith('content_scorer.mjs')) {
    runScorer(path.resolve(process.cwd(), targetFile)).catch(console.error);
}
