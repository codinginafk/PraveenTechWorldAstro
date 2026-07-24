import fs from 'fs';
import path from 'path';

const dir = 'src/content/articles';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));

const replacements = [
  // 404 Fixes
  { old: 'https://en.wikipedia.org/wiki/Comparison_of_artificial_intelligence_software', new: 'https://en.wikipedia.org/wiki/List_of_artificial_intelligence_projects' },
  { old: 'https://www.bing.com/webmasters/help/how-to-submit-sitemaps-82a15bd7', new: 'https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed' },
  { old: 'https://www.educause.edu/focus-areas-and-initiatives/policy-and-law/heisc', new: 'https://www.educause.edu/' },
  { old: 'https://support.microsoft.com/en-us/windows/recovery-options-in-windows', new: 'https://support.microsoft.com/en-us/windows/recovery-options-in-windows-31062c97-de70-571b-2a69-e5c5862bd43f' },
  { old: 'https://learn.microsoft.com/en-us/microsoft-365/security/defender-endpoint/microsoft-defender-antivirus', new: 'https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-antivirus-in-windows' },

  // 301 Redirect Fixes
  { old: 'https://developers.google.com/speed/pagespeed/insights/', new: 'https://pagespeed.web.dev/' },
  { old: 'https://developers.google.com/search/docs/beginner/seo-starter-guide', new: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide' },
  { old: 'https://developers.google.com/search/docs/beginner/how-search-works', new: 'https://developers.google.com/search/docs/fundamentals/how-search-works' },
  { old: 'https://developers.google.com/search/docs/advanced/sitemaps/overview', new: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview' },
  { old: 'https://developers.google.com/search/docs/advanced/robots/robots_txt', new: 'https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec' },
  { old: 'https://zapier.com/learn/', new: 'https://zapier.com/resources/guides' },
  { old: 'https://openai.com/blog/chatgpt/', new: 'https://openai.com/index/chatgpt/' },
  { old: 'https://platform.openai.com/docs/models/overview', new: 'https://developers.openai.com/api/docs/models/overview' },
  { old: 'https://www.privacyguides.org/vpn/', new: 'https://www.privacyguides.org/en/vpn/' },
  { old: 'https://web.dev/vitals/', new: 'https://web.dev/articles/vitals' },
  { old: 'https://tech.ed.gov/studentsafety/privacy/', new: 'https://www.ed.gov/studentsafety/privacy/' },
  { old: 'https://powerautomate.microsoft.com/', new: 'https://www.microsoft.com/en-us/power-platform/products/power-automate/' }
];

let totalFixed = 0;
files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  replacements.forEach(r => {
    if (content.includes(r.old)) {
      content = content.replaceAll(r.old, r.new);
    }
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    totalFixed++;
    console.log(`Updated external links in: ${file}`);
  }
});

console.log(`Successfully updated external URLs in ${totalFixed} files!`);
