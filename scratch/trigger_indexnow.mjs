import fs from 'fs';
import path from 'path';

const SITE_URL = "https://www.praveentechworld.com";
const INDEXNOW_KEY = "b5ccb860-ee82-4baa-9416-61b965ff55d7";

// Gather all pages
const dir = 'src/content/articles';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));

const urls = [
  `${SITE_URL}/`,
  `${SITE_URL}/blog`,
  `${SITE_URL}/tools`,
  `${SITE_URL}/portfolio`,
  `${SITE_URL}/about`,
  `${SITE_URL}/terms`,
];

// Add guides
const categories = ['ai-automation', 'ai-tools', 'ai-websites', 'ai-workflows', 'android-fixes', 'automation', 'build-in-public', 'career-growth', 'free-software', 'hardware-troubleshooting', 'hosting-infra', 'it-operations', 'privacy', 'productivity', 'security', 'website-setup', 'windows-fixes'];
categories.forEach(cat => {
  urls.push(`${SITE_URL}/guides/${cat}`);
  urls.push(`${SITE_URL}/category/${cat}`);
});

// Add all 90 articles
files.forEach(file => {
  const slug = file.replace('.mdx', '');
  urls.push(`${SITE_URL}/blog/${slug}`);
});

console.log(`Sending ${urls.length} URLs to IndexNow API...`);

async function submitIndexNow() {
  const payload = {
    host: "www.praveentechworld.com",
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  const endpoints = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
    "https://search.yandex.ru/indexnow"
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Pinging ${endpoint}...`);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      });

      console.log(`Response from ${endpoint}: HTTP ${res.status}`);
      if (res.status === 200 || res.status === 202) {
        console.log(`✅ IndexNow Ping SUCCESS for ${endpoint}`);
      } else {
        const text = await res.text();
        console.log(`⚠️ Status details: ${text}`);
      }
    } catch (err) {
      console.error(`❌ IndexNow Error for ${endpoint}:`, err.message);
    }
  }
}

submitIndexNow();
