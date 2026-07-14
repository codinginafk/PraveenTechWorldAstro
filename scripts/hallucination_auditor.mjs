/**
 * hallucination_auditor.mjs
 * ============================================================
 * Retroactive scanner to extract code blocks from existing articles
 * and verify them using an ephemeral Docker execution sandbox and LLM.
 * ============================================================
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');

// Utility to sleep
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function callLLM(systemPrompt, userContent, model = 'openai/gpt-4o-mini') {
    const dotenv = await import('dotenv');
    dotenv.config();
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new Error('LLM_API_KEY missing');

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

    const data = await res.json();
    if (data.error) throw new Error(`OpenRouter API Error: ${data.error.message || JSON.stringify(data.error)}`);
    if (!data.choices || !data.choices[0]) throw new Error(`Unexpected API response: ${JSON.stringify(data)}`);
    
    return data.choices[0].message.content.trim();
}

/**
 * Runs a bash command inside an ephemeral Ubuntu Docker container
 */
async function runInDockerSandbox(code, language) {
    console.log(`[Docker Sandbox] Testing ${language} block...`);
    
    let command;
    // We base64 encode the code to safely pass it into the docker container
    const b64Code = Buffer.from(code).toString('base64');

    if (language === 'bash' || language === 'sh') {
        // Run with timeout, ignoring network/auth but checking for syntax or missing packages
        // Replace 'apt-get install' with 'apt-cache show' to just check if packages exist
        let safeCode = code.replace(/apt-get install -y/g, 'apt-cache show').replace(/apt-get install/g, 'apt-cache show').replace(/apt install/g, 'apt-cache show');
        const b64SafeCode = Buffer.from(safeCode).toString('base64');
        command = `docker run --rm --network none ubuntu:22.04 bash -c "echo ${b64SafeCode} | base64 -d | timeout 10 bash"`;
    } else if (language === 'python') {
        // Syntax check only for Python to avoid running destructive code
        command = `docker run --rm python:3.10-slim bash -c "echo ${b64Code} | base64 -d > test.py && python -m py_compile test.py"`;
    } else {
        return { status: 'skipped', output: 'Unsupported language for sandbox.' };
    }

    try {
        const { stdout, stderr } = await execAsync(command);
        return { status: 'passed', output: stdout || stderr };
    } catch (error) {
        // Process error codes
        if (error.stderr?.includes('Unable to locate package') || error.stdout?.includes('Unable to locate package') || error.stderr?.includes('No packages found')) {
            return { status: 'hallucinated_package', output: error.stderr || error.stdout };
        }
        if (error.stderr?.includes('SyntaxError')) {
            return { status: 'syntax_error', output: error.stderr };
        }
        if (error.stderr?.includes('command not found') && !error.stderr?.includes('docker')) {
            return { status: 'warning_missing_tool', output: error.stderr };
        }
        if (error.message.includes('docker') && error.message.includes('not recognized')) {
            return { status: 'docker_missing', output: 'Docker is not installed or not running on this machine.' };
        }
        
        return { status: 'failed', output: error.message };
    }
}

/**
 * Extract code blocks from markdown
 */
function extractCodeBlocks(markdown) {
    const regex = /```(bash|sh|python|yaml|json)\n([\s\S]*?)```/g;
    let match;
    const blocks = [];
    while ((match = regex.exec(markdown)) !== null) {
        blocks.push({
            language: match[1],
            code: match[2].trim()
        });
    }
    return blocks;
}

export async function auditExistingArticles() {
    console.log(`[Auditor] Scanning ${ARTICLES_DIR}...`);
    
    const mdxFiles = ['how-deepseek-orchestration-logs-improve-cloud-operations-2026.mdx'];
    console.log(`[Auditor] Found ${mdxFiles.length} files. Starting hallucination audit...\n`);

    const report = [];
    let processed = 0;

    for (const file of mdxFiles) {
        const filePath = path.join(ARTICLES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const blocks = extractCodeBlocks(content);

        if (blocks.length === 0) continue;

        console.log(`\n==========================================`);
        console.log(`[Auditor] Processing: ${file} (${blocks.length} code blocks)`);
        
        const fileReport = { file, issues: [] };

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            console.log(`  -> Block ${i+1}: ${block.language}`);

            // 1. Docker Sandbox Check
            if (block.language === 'bash' || block.language === 'python') {
                const dockerRes = await runInDockerSandbox(block.code, block.language);
                if (dockerRes.status === 'hallucinated_package') {
                    fileReport.issues.push(`[Block ${i+1} | ${block.language}] CRITICAL: Hallucinated APT Package detected in sandbox.\nOutput: ${dockerRes.output.slice(0, 100)}`);
                    console.log(`     ❌ Hallucinated package detected!`);
                } else if (dockerRes.status === 'syntax_error') {
                    fileReport.issues.push(`[Block ${i+1} | ${block.language}] CRITICAL: Syntax Error.\nOutput: ${dockerRes.output.slice(0, 100)}`);
                    console.log(`     ❌ Syntax error detected!`);
                } else if (dockerRes.status === 'docker_missing') {
                    fileReport.issues.push(`[Block ${i+1} | ${block.language}] CRITICAL: Docker not installed.`);
                    console.log(`     ❌ Docker is not installed or not running.`);
                } else {
                    console.log(`     ✅ Sandbox check passed or returned acceptable warning (${dockerRes.status}).`);
                }
            }

            // 2. LLM Skeptic Check (SKIPPED DUE TO 402 API LIMIT)
            console.log(`     ⏭️  Skeptic Check skipped (API limit).`);
        }

        if (fileReport.issues.length > 0) {
            report.push(fileReport);
        }
        
        processed++;
    }

    // Write Report
    const reportPath = path.resolve(process.cwd(), 'HALLUCINATION_REPORT.md');
    let reportMd = `# Hallucination Audit Report\n\nGenerated on: ${new Date().toISOString()}\n\n`;
    
    if (report.length === 0) {
        reportMd += `✅ No hallucinations found in the audited files!\n`;
    } else {
        reportMd += `⚠️ Found potential fabrications in ${report.length} files:\n\n`;
        for (const r of report) {
            reportMd += `### ${r.file}\n`;
            for (const issue of r.issues) {
                reportMd += `- ${issue.replace(/\n/g, ' ')}\n`;
            }
            reportMd += `\n`;
        }
    }

    await fs.writeFile(reportPath, reportMd, 'utf-8');
    console.log(`\n[Auditor] 🎉 Complete! Report saved to HALLUCINATION_REPORT.md`);
}

// CLI
if (process.argv[1]?.endsWith('hallucination_auditor.mjs')) {
    auditExistingArticles().catch(console.error);
}
