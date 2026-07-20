const fs = require('fs');
const path = require('path');

const projectRoot = 'C:\\Users\\bunny\\Downloads\\00Resume\\Building_Tech_Website';
const artifactsDir = 'C:\\Users\\bunny\\.gemini\\antigravity\\brain\\db8d935a-7a82-4063-8e99-0c1135abc327';
const destImgDir = path.join(projectRoot, 'public/images/generated');
const articlesDir = path.join(projectRoot, 'src/content/articles');

// Map of generated artifact files to website destination configurations
const copyMap = [
  {
    artifactPattern: /add_website_to_google_search_/,
    destJpgName: 'how-to-add-your-website-to-google-search-step-by-step-guide.jpg',
    mdxName: 'how-to-add-your-website-to-google-search-step-by-step-guide.mdx'
  },
  {
    artifactPattern: /google_analytics_beginners_/,
    destJpgName: 'google-analytics-for-beginners-how-to-track-your-website-traffic.jpg',
    mdxName: 'google-analytics-for-beginners-how-to-track-your-website-traffic.mdx'
  },
  {
    artifactPattern: /ga4_events_tracking_/,
    destJpgName: 'ga4-events-automatic-recommended-custom-tracking-guide.jpg',
    mdxName: 'ga4-events-automatic-recommended-custom-tracking-guide.mdx'
  },
  {
    artifactPattern: /fix_google_indexing_errors_/,
    destJpgName: 'how-to-fix-google-indexing-errors-crawled-not-indexed.jpg',
    mdxName: 'how-to-fix-google-indexing-errors-crawled-not-indexed.mdx'
  },
  {
    artifactPattern: /ga4_page_tracking_/,
    destJpgName: 'google-analytics-4-page-tracking-how-it-works.jpg',
    mdxName: 'google-analytics-4-page-tracking-how-it-works.mdx'
  }
];

if (!fs.existsSync(destImgDir)) {
  fs.mkdirSync(destImgDir, { recursive: true });
}

const files = fs.readdirSync(artifactsDir);

copyMap.forEach(cfg => {
  const matchedFile = files.find(f => cfg.artifactPattern.test(f));
  if (matchedFile) {
    const srcPath = path.join(artifactsDir, matchedFile);
    const destPath = path.join(destImgDir, cfg.destJpgName);
    
    // Copy the image file
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${matchedFile} -> public/images/generated/${cfg.destJpgName}`);

    // Update MDX frontmatter
    const mdxPath = path.join(articlesDir, cfg.mdxName);
    if (fs.existsSync(mdxPath)) {
      let content = fs.readFileSync(mdxPath, 'utf8');
      const oldCoverMatch = content.match(/coverImage:\s*"([^"]+)"/);
      
      if (oldCoverMatch) {
        const oldCover = oldCoverMatch[1];
        const newCover = `/images/generated/${cfg.destJpgName}`;
        if (oldCover !== newCover) {
          content = content.replace(`coverImage: "${oldCover}"`, `coverImage: "${newCover}"`);
          fs.writeFileSync(mdxPath, content, 'utf8');
          console.log(`Updated frontmatter: ${cfg.mdxName} (${oldCover} -> ${newCover})`);
        } else {
          console.log(`Frontmatter already matches for: ${cfg.mdxName}`);
        }
      } else {
        console.warn(`Warning: Could not find coverImage line in ${cfg.mdxName}`);
      }
    } else {
      console.warn(`Warning: MDX file not found: ${cfg.mdxName}`);
    }
  } else {
    console.warn(`Warning: No artifact found matching pattern ${cfg.artifactPattern}`);
  }
});
