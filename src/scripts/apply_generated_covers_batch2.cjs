const fs = require('fs');
const path = require('path');

const projectRoot = 'C:\\Users\\bunny\\Downloads\\00Resume\\Building_Tech_Website';
const artifactsDir = 'C:\\Users\\bunny\\.gemini\\antigravity\\brain\\db8d935a-7a82-4063-8e99-0c1135abc327';
const destImgDir = path.join(projectRoot, 'public/images/generated');
const articlesDir = path.join(projectRoot, 'src/content/articles');

const copyMap = [
  {
    artifactPattern: /best_free_vpns_guide_/,
    destJpgName: 'best-free-vpn-services-in-2026-complete-comparison-and-privacy-guide.jpg',
    mdxName: 'best-free-vpn-services-in-2026-complete-comparison-and-privacy-guide.mdx'
  },
  {
    artifactPattern: /ga4_not_tracking_fixes_/,
    destJpgName: 'ga4-not-tracking-visitors-12-troubleshooting-steps.jpg',
    mdxName: 'ga4-not-tracking-visitors-12-troubleshooting-steps.mdx'
  },
  {
    artifactPattern: /reset_windows_viruses_check_/,
    destJpgName: 'does-resetting-windows-remove-viruses-completely.jpg',
    mdxName: 'does-resetting-windows-remove-viruses-completely.mdx'
  },
  {
    artifactPattern: /gsc_no_data_fixes_/,
    destJpgName: 'google-search-console-not-showing-data-8-fixes.jpg',
    mdxName: 'google-search-console-not-showing-data-8-fixes.mdx'
  },
  {
    artifactPattern: /best_password_managers_/,
    destJpgName: 'best-password-managers-in-2026-security-features-and-pricing-compared.jpg',
    mdxName: 'best-password-managers-in-2026-security-features-and-pricing-compared.mdx'
  },
  {
    artifactPattern: /android_not_charging_fixes_/,
    destJpgName: 'android-phone-not-charging-10-fixes-for-2026-complete-troubleshooting-guide.jpg',
    mdxName: 'android-phone-not-charging-10-fixes-for-2026-complete-troubleshooting-guide.mdx'
  },
  {
    artifactPattern: /android_battery_drain_fixes_/,
    destJpgName: 'android-battery-draining-fast-after-update-7-proven-fixes-for-2026.jpg',
    mdxName: 'android-battery-draining-fast-after-update-7-proven-fixes-for-2026.mdx'
  },
  {
    artifactPattern: /university_data_protection_/,
    destJpgName: 'data-protection-for-universities-compliance-and-security-guide.jpg',
    mdxName: 'data-protection-for-universities-compliance-and-security-guide.mdx'
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
