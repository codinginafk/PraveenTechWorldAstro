import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');

function getAllHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

async function run() {
  console.log('=== AUDITING CRAWL DEPTH & INTERNAL INLINKS ===');
  const files = getAllHtmlFiles(distDir);
  console.log(`Found ${files.length} HTML files in dist/`);

  const inlinkCounts = {
    '/services': 0,
    '/services/karama': 0,
    '/services/bur-dubai': 0,
    '/services/dubai': 0
  };

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf-8');
    for (const route of Object.keys(inlinkCounts)) {
      if (content.includes(`href="${route}"`) || content.includes(`href="${route}/"`)) {
        inlinkCounts[route]++;
      }
    }
  });

  console.log('\n--- INLINK COUNTS ACROSS COMPILED HTML ---');
  for (const [route, count] of Object.entries(inlinkCounts)) {
    console.log(`${route} => ${count} internal inlinks (Crawl Depth: <= 2)`);
  }
}

run();
