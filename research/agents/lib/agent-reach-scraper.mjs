// Agent-Reach Scraper & Crawler Helper (Panniantong/agent-reach integration)
// Provides zero-API-fee multi-platform crawling for X/Twitter, Reddit, GitHub, and Jina Reader.

import fetch from 'node-fetch';

/**
 * Crawls URL or query via Jina Reader / Agent-Reach free endpoints
 * @param {string} targetUrlOrQuery 
 * @returns {Promise<string>} Clean markdown content
 */
export async function agentReachCrawl(targetUrlOrQuery) {
  try {
    const isUrl = targetUrlOrQuery.startsWith('http://') || targetUrlOrQuery.startsWith('https://');
    const endpoint = isUrl 
      ? `https://r.jina.ai/${encodeURIComponent(targetUrlOrQuery)}`
      : `https://s.jina.ai/${encodeURIComponent(targetUrlOrQuery)}`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Agent-Reach/1.0 (PraveenTechWorld Crawler)'
      }
    });

    if (!res.ok) {
      throw new Error(`Agent-Reach request failed with status ${res.status}`);
    }

    const text = await res.text();
    return text;
  } catch (err) {
    console.error('Agent-Reach Crawl Error:', err.message);
    return null;
  }
}

/**
 * Searches Reddit / X tech discussions via Agent-Reach query routing
 * @param {string} topic 
 */
export async function agentReachSearchSocial(topic) {
  const searchQuery = `site:reddit.com OR site:x.com ${topic} 2026`;
  return await agentReachCrawl(searchQuery);
}
