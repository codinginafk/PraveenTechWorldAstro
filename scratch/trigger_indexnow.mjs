import { pingIndexNow } from '../research/agents/seo-agent/gsc-client.mjs';

// Usage: node scratch/trigger_indexnow.mjs /blog/changed-page /blog/another-page
// IndexNow is intentionally limited to explicit changed URLs. The sitemap is
// submitted separately and is not used as a bulk notification list.
const urls = process.argv.slice(2).filter(Boolean);

if (urls.length === 0) {
  console.error('Usage: node scratch/trigger_indexnow.mjs <changed-url> [<changed-url> ...]');
  process.exit(1);
}

const ok = await pingIndexNow(urls);
if (!ok) process.exitCode = 1;
