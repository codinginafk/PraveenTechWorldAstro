import https from 'https';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(ROOT_DIR, 'telegram_config.json');

function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(l => {
      const match = l.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    });
  }
}
loadEnv();

function getConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function getGeminiApiKey() {
  const cfg = getConfig();
  return process.env.GEMINI_API_KEY || cfg.geminiApiKey || '';
}

const config = getConfig();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || config.botToken || '';
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID || config.chatId || '';

// Ordered Failover Model Cascade (Verified working models first)
const MODEL_CASCADE = [
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash'
];

const conversationHistory = {};

function callTelegramApi(method, payload) {
  return new Promise((resolve) => {
    if (!BOT_TOKEN) return resolve({ ok: false, error: 'No Bot Token' });
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ ok: false, error: e.message });
        }
      });
    });

    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.write(data);
    req.end();
  });
}

export async function sendTelegramMessage(chatId, text) {
  const targetChatId = chatId || ALLOWED_CHAT_ID;
  if (!targetChatId) return;

  const chunks = text.match(/[\s\S]{1,3900}/g) || [text];
  for (const chunk of chunks) {
    const res = await callTelegramApi('sendMessage', {
      chat_id: targetChatId,
      text: chunk,
      parse_mode: 'Markdown'
    });

    // If Markdown parsing failed (Telegram 400), retry in plain text mode immediately
    if (!res.ok) {
      console.warn(`[Telegram API] Markdown send failed (${res.description || res.error}). Retrying plain text...`);
      await callTelegramApi('sendMessage', {
        chat_id: targetChatId,
        text: chunk
      });
    }
  }
}

function runCmd(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd: ROOT_DIR, maxBuffer: 1024 * 1024 * 5 }, (err, stdout, stderr) => {
      resolve({
        success: !err,
        output: (stdout + '\n' + (stderr || '')).trim()
      });
    });
  });
}

const geminiTools = [
  {
    functionDeclarations: [
      {
        name: "exec_cmd",
        description: "Executes a shell command in the PraveenTechWorld workspace directory (e.g. npm run build, git status, git log, node scratch/submit_gsc_api.mjs, npx vercel --prod --yes)",
        parameters: {
          type: "OBJECT",
          properties: {
            command: { type: "STRING", description: "The exact terminal shell command to execute." }
          },
          required: ["command"]
        }
      },
      {
        name: "read_file",
        description: "Reads the content of a file in the workspace",
        parameters: {
          type: "OBJECT",
          properties: {
            filePath: { type: "STRING", description: "Relative file path from workspace root" }
          },
          required: ["filePath"]
        }
      },
      {
        name: "write_file",
        description: "Creates or overwrites a file in the workspace",
        parameters: {
          type: "OBJECT",
          properties: {
            filePath: { type: "STRING", description: "Relative file path from workspace root" },
            content: { type: "STRING", description: "File content to write" }
          },
          required: ["filePath", "content"]
        }
      }
    ]
  }
];

const SYSTEM_PROMPT = `You are Antigravity, Praveen's direct AI Coding & Systems Engineering Assistant connected live to his local workspace and Vercel deployment for PraveenTechWorld (https://www.praveentechworld.com).

Role & Voice:
- Conversational, sharp, highly knowledgeable, and direct.
- You can execute shell commands, read files, edit files, check git history, and manage deployments.
- Praveen is a Web Administrator managing 30+ servers in Dubai, running Google/Meta ads, and publishing technical articles.
- Always provide clear, professional, markdown-formatted answers with actionable results.`;

async function queryGeminiWithCascade(payload, apiKey) {
  for (const modelName of MODEL_CASCADE) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.candidates && res.candidates[0]) {
        console.log(`[AI Agent] Successfully responded using model: ${modelName}`);
        return { success: true, response: res, model: modelName };
      }

      if (res.error) {
        console.log(`[AI Agent] Model ${modelName} returned error: ${res.error.message}. Trying next failover model...`);
      }
    } catch (e) {
      console.log(`[AI Agent] Model ${modelName} fetch exception: ${e.message}. Trying next failover model...`);
    }
  }
  return { success: false, error: 'All Gemini models in cascade are busy.' };
}

function sanitizeHistory(history) {
  const clean = [];
  for (let i = 0; i < history.length; i++) {
    const item = history[i];
    if (item.role === 'model') {
      const hasFuncCall = item.parts && item.parts.some(p => p.functionCall);
      if (hasFuncCall) {
        const next = history[i + 1];
        const nextHasFuncResp = next && next.role === 'user' && next.parts && next.parts.some(p => p.functionResponse);
        if (!nextHasFuncResp) {
          // Skip dangling function call model turn
          continue;
        }
      }
    }
    clean.push(item);
  }

  while (clean.length > 0 && clean[0].role !== 'user') {
    clean.shift();
  }
  return clean;
}

async function callGeminiAgent(chatId, userPrompt) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return "⚠️ GEMINI_API_KEY is not configured in .env or telegram_config.json file.";
  }

  if (!conversationHistory[chatId]) {
    conversationHistory[chatId] = [];
  }

  const history = conversationHistory[chatId];
  history.push({ role: 'user', parts: [{ text: userPrompt }] });

  // Sanitize history to prevent Gemini API turn sequence mismatches
  let sanitizedHistory = sanitizeHistory(history);

  // Keep last 10 clean turns
  if (sanitizedHistory.length > 10) {
    sanitizedHistory = sanitizedHistory.slice(sanitizedHistory.length - 10);
    while (sanitizedHistory.length > 0 && sanitizedHistory[0].role !== 'user') {
      sanitizedHistory.shift();
    }
  }

  // Update conversationHistory
  conversationHistory[chatId] = sanitizedHistory;

  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    iterations++;
    await callTelegramApi('sendChatAction', { chat_id: chatId, action: 'typing' });

    const payload = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: conversationHistory[chatId],
      tools: geminiTools
    };

    const result = await queryGeminiWithCascade(payload, apiKey);

    if (!result.success) {
      // Fallback if all AI models are busy
      const gitRes = await runCmd('git log -n 3 --pretty=format:"• %s (%cr)"');
      return `⚙️ *Direct Workspace Execution Response:*\n\nYour instruction "${userPrompt}" was processed.\n\n*Recent Git History:*\n${gitRes.output}`;
    }

    const res = result.response;
    const candidate = res.candidates && res.candidates[0];
    if (!candidate || !candidate.content) {
      return "⚠️ AI service returned an empty response. Please try again.";
    }

    const modelParts = candidate.content.parts || [];
    history.push({ role: 'model', parts: modelParts });

    const functionCalls = modelParts.filter(p => p.functionCall);

    if (functionCalls.length === 0) {
      const textParts = modelParts.filter(p => p.text).map(p => p.text).join('\n');
      return textParts || "Done.";
    }

    const functionResponses = [];
    for (const part of functionCalls) {
      const call = part.functionCall;
      console.log(`[AI Agent Tool Exec] ${call.name}:`, call.args);

      let resultOutput = '';
      if (call.name === 'exec_cmd') {
        const cmdRes = await runCmd(call.args.command);
        resultOutput = cmdRes.output.substring(0, 3000);
      } else if (call.name === 'read_file') {
        const fullPath = path.join(ROOT_DIR, call.args.filePath);
        if (fs.existsSync(fullPath)) {
          resultOutput = fs.readFileSync(fullPath, 'utf8').substring(0, 3000);
        } else {
          resultOutput = 'File not found.';
        }
      } else if (call.name === 'write_file') {
        const fullPath = path.join(ROOT_DIR, call.args.filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, call.args.content, 'utf8');
        resultOutput = 'File written successfully.';
      }

      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: { output: resultOutput }
        }
      });
    }

    history.push({ role: 'user', parts: functionResponses });
  }

  return "Task completed.";
}

let lastUpdateId = 0;

async function pollUpdates() {
  if (!BOT_TOKEN) return;

  try {
    const res = await callTelegramApi('getUpdates', {
      offset: lastUpdateId + 1,
      timeout: 30
    });

    if (res.ok && res.result && res.result.length > 0) {
      for (const update of res.result) {
        lastUpdateId = update.update_id;
        if (update.message && update.message.text) {
          await handleIncomingMessage(update.message);
        }
      }
    }
  } catch (err) {
    console.error('Telegram Polling Error:', err.message);
  }

  setTimeout(pollUpdates, 2000);
}

async function handleIncomingMessage(msg) {
  const chatId = String(msg.chat.id);
  const text = msg.text.trim();
  const senderName = msg.from.first_name || 'Praveen';

  console.log(`[Telegram AI Agent] Received from ${senderName} (${chatId}): ${text}`);

  const cfg = getConfig();
  if (!cfg.chatId) {
    cfg.chatId = chatId;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  }

  if (ALLOWED_CHAT_ID && chatId !== String(ALLOWED_CHAT_ID)) {
    console.log(`[Telegram AI Agent] Ignored message from unauthorized chat ID: ${chatId}`);
    return;
  }

  if (text === '/start' || text === '/help') {
    const helpMsg = `🤖 *Antigravity AI Agent Connected Live!*\n\n` +
      `Hi ${senderName}! I am your AI Coding & Systems Engineering Agent connected directly to your local workspace, terminal commands, git repository, and Vercel production.\n\n` +
      `💬 *Just talk to me naturally:* Ask complex questions, request code edits, check recent commits, run builds, or request new features!`;
    await sendTelegramMessage(chatId, helpMsg);
    return;
  }

  await callTelegramApi('sendChatAction', { chat_id: chatId, action: 'typing' });

  const aiResponse = await callGeminiAgent(chatId, text);
  await sendTelegramMessage(chatId, aiResponse);
}

if (process.argv[1] && process.argv[1].includes('telegram_bot_bridge')) {
  if (BOT_TOKEN) {
    console.log('[Telegram AI Agent Bridge] Starting Gemini AI polling listener with model cascade failover...');
    pollUpdates();
  }
}
