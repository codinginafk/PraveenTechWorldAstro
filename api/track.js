export default async function handler(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json();
    const ua = body.userAgent || request.headers.get('user-agent') || '';
    const path = body.path || '/';
    const referrer = body.referrer || '';
    const timestamp = new Date().toISOString();

    const botPatterns = {
      GPTBot: ['GPTBot', 'ChatGPT-User'],
      ClaudeBot: ['ClaudeBot', 'Claude-Web'],
      PerplexityBot: ['PerplexityBot'],
      CCBot: ['CCBot'],
      Bingbot: ['bingbot', 'Bingbot', 'BingPreview'],
      Yahoo: ['Slurp'],
      Googlebot: ['Googlebot', 'Google-Cloud-Scheduler'],
      Applebot: ['Applebot'],
      Amazonbot: ['Amazonbot'],
      Bytespider: ['Bytespider'],
      Cohere: ['cohere-ai', 'Cohere'],
      FacebookBot: ['facebookexternalhit', 'FacebookBot'],
      Twitterbot: ['Twitterbot'],
    };

    let detectedBot = null;
    const uaLower = ua.toLowerCase();
    for (const [botName, patterns] of Object.entries(botPatterns)) {
      if (patterns.some(p => uaLower.includes(p.toLowerCase()))) {
        detectedBot = botName;
        break;
      }
    }

    const record = { timestamp, path, userAgent: ua, bot: detectedBot, referrer };
    const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

    if (BLOB_TOKEN) {
      const { put } = await import('@vercel/blob');
      const blobKey = `bot-traffic.jsonl`;
      let existing = '';
      try {
        const existingRes = await fetch(
          `https://blob.vercel-storage.com/${blobKey}`,
          { headers: { Authorization: `Bearer ${BLOB_TOKEN}` } }
        );
        if (existingRes.ok) {
          existing = await existingRes.text();
        }
      } catch {}

      const newLine = JSON.stringify(record) + '\n';
      await put(blobKey, existing + newLine, { access: 'private', addRandomSuffix: false });
    }

    return new Response(JSON.stringify({ ok: true, bot: detectedBot }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}
