const fs = require('fs');
const path = require('path');

const projectRoot = 'C:\\Users\\bunny\\Downloads\\00Resume\\Building_Tech_Website';
const analyticsPath = path.join(projectRoot, 'research/agents/analytics-data.json');
const articlesDir = path.join(projectRoot, 'src/content/articles');

if (!fs.existsSync(analyticsPath)) {
  console.error('Analytics file not found: ' + analyticsPath);
  process.exit(1);
}

const analytics = JSON.parse(fs.readFileSync(analyticsPath, 'utf8'));
const gscData = analytics.gscData || [];

const highImpressionArticles = [];

gscData.forEach(row => {
  const url = row.keys?.[0] || '';
  // Check if it's an article URL (i.e. contains /blog/ or is an older path)
  if (url.includes('/blog/') && !url.endsWith('/blog')) {
    const slug = url.split('/blog/')[1]?.split(/[?#]/)[0];
    if (slug && row.impressions > 10) {
      highImpressionArticles.push({
        url,
        slug,
        impressions: row.impressions,
        clicks: row.clicks
      });
    }
  } else if (url.includes('/2026/')) {
    // Legacy URLs (need redirect mappings, but let's check)
    const match = url.match(/\/2026\/\d+\/([^/.]+)/);
    if (match && match[1] && row.impressions > 10) {
      highImpressionArticles.push({
        url,
        slug: match[1].toLowerCase(),
        impressions: row.impressions,
        clicks: row.clicks,
        legacy: true
      });
    }
  }
});

// Map slugs to actual files and read coverImage
console.log('=== HIGH IMPRESSION ARTICLES (>10 IMPRESSIONS) ===');
console.log('Total found:', highImpressionArticles.length);
console.log('--------------------------------------------------');

const activeSlugs = new Set();
const finalReport = [];

highImpressionArticles.forEach(art => {
  let fileSlug = art.slug;
  let mdxPath = path.join(articlesDir, `${fileSlug}.mdx`);

  // Handle minor naming differences
  if (!fs.existsSync(mdxPath)) {
    // Try to find file matching slug prefix
    const files = fs.readdirSync(articlesDir);
    const matchedFile = files.find(f => f.startsWith(fileSlug) || fileSlug.startsWith(f.replace('.mdx', '')));
    if (matchedFile) {
      mdxPath = path.join(articlesDir, matchedFile);
      fileSlug = matchedFile.replace('.mdx', '');
    }
  }

  if (fs.existsSync(mdxPath)) {
    if (activeSlugs.has(fileSlug)) return; // prevent duplicates
    activeSlugs.add(fileSlug);

    const mdxContent = fs.readFileSync(mdxPath, 'utf8');
    const coverMatch = mdxContent.match(/coverImage:\s*"([^"]+)"/);
    const coverImage = coverMatch ? coverMatch[1] : 'none';

    finalReport.push({
      file: fileSlug + '.mdx',
      impressions: art.impressions,
      clicks: art.clicks,
      coverImage
    });
  } else {
    // console.log(`File not found for slug: ${art.slug} (${art.url})`);
  }
});

finalReport.sort((a, b) => b.impressions - a.impressions);
finalReport.forEach(r => {
  console.log(`- File: ${r.file}`);
  console.log(`  Impressions: ${r.impressions} | Clicks: ${r.clicks}`);
  console.log(`  Cover Image: ${r.coverImage}`);
  console.log('--------------------------------------------------');
});
