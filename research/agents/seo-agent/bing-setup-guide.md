# Bing Webmaster Tools — One-Time Setup

1. Go to https://www.bing.com/webmasters/ and sign in with a Microsoft account
2. Add site: `praveentechworld.com`
3. Choose verification method: DNS TXT record or HTML meta tag
   - DNS: Add a TXT record to your domain DNS (fastest, survives redeployments)
   - Meta tag: Add the `<meta name="bingvalidate" content="...">` to `src/components/seo/SEO.astro`
4. Submit sitemap: `https://www.praveentechworld.com/sitemap-index.xml`
5. Go to Settings → API Access → Generate API Key
6. Copy the API key
7. Get your Site ID (GUID) from the dashboard URL or by calling the API

Add to `.env`:
```
BING_API_KEY=your_api_key_here
BING_SITE_ID=www.praveentechworld.com
```

Test with: `node research/agents/seo-agent/bing-client.mjs crawl`
