const BOT_PATTERNS = [
  { name: 'GPTBot', patterns: ['GPTBot', 'ChatGPT-User'] },
  { name: 'ClaudeBot', patterns: ['ClaudeBot', 'Claude-Web'] },
  { name: 'PerplexityBot', patterns: ['PerplexityBot'] },
  { name: 'CCBot', patterns: ['CCBot'] },
  { name: 'Bingbot', patterns: ['bingbot', 'Bingbot', 'BingPreview'] },
  { name: 'Yahoo', patterns: ['Slurp'] },
  { name: 'Googlebot', patterns: ['Googlebot', 'Google-Cloud-Scheduler'] },
  { name: 'Applebot', patterns: ['Applebot'] },
  { name: 'Amazonbot', patterns: ['Amazonbot'] },
  { name: 'Bytespider', patterns: ['Bytespider'] },
  { name: 'Cohere', patterns: ['cohere-ai', 'Cohere'] },
  { name: 'FacebookBot', patterns: ['facebookexternalhit', 'FacebookBot'] },
  { name: 'Twitterbot', patterns: ['Twitterbot'] },
];

export const config = {
  matcher: [
    '/((?!api/|_next/|_astro/|pagefind/|images/|fonts/|favicon|robots\\.txt|llms\\.txt|sitemap|b5ccb860).*)',
  ],
};

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  const url = request.nextUrl.pathname;
  const uaLower = ua.toLowerCase();

  const detected = BOT_PATTERNS.find(({ patterns }) =>
    patterns.some(p => uaLower.includes(p.toLowerCase()))
  );

  if (detected) {
    const siteUrl = `https://${request.headers.get('host') || 'www.praveentechworld.com'}`;
    try {
      await fetch(`${siteUrl}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: url,
          userAgent: ua,
          bot: detected.name,
          referrer: request.headers.get('referer') || '',
          source: 'middleware',
        }),
      });
    } catch {}
  }
}
