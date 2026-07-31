// Vercel Serverless Function for canonical Turnstile siteverify
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }

  const token = req.body?.['cf-turnstile-response'] || req.body?.token || req.body?.response;
  const clientIp = req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'] || req.socket?.remoteAddress || '';

  if (!token) {
    return res.status(400).json({ success: false, error: 'missing_token' });
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET || '',
        response: token,
        remoteip: clientIp,
      }),
    });

    if (!response.ok) {
      return res.status(403).json({ success: false, error: `siteverify_http_${response.status}` });
    }

    const result = await response.json();

    if (!result.success) {
      return res.status(403).json({ success: false, error: 'verification_failed', result });
    }

    return res.status(200).json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'network_error' });
  }
}
