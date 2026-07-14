import fs from "fs";
import path from "path";

const slugs = [
  "windows-11-volume-control-not-working-8-fixes-5h98",
  "chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows-2n7j",
];

for (const slug of slugs) {
  const url = `https://dev.to/youngones/${slug}`;
  const res = await fetch(url);
  const html = await res.text();
  const noindex = html.includes('noindex');
  const canonicalMatch = html.match(/<link rel="canonical"[^>]*href="([^"]+)"/);
  console.log(`Article: ${slug}`);
  console.log(`  noindex: ${noindex}`);
  console.log(`  canonical: ${canonicalMatch ? canonicalMatch[1] : "none"}`);
  console.log("");
}

// Clean up
fs.rmSync(new URL(import.meta.url).pathname);
