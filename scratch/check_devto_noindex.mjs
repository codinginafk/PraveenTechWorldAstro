import Database from 'better-sqlite3';
import fetch from 'node-fetch';
import path from 'path';

const db = new Database(path.resolve('mission_control.sqlite'));

async function main() {
  const published = db.prepare("SELECT id, topic, devto_url FROM artifacts WHERE devto_url IS NOT NULL LIMIT 5").all();
  if (published.length === 0) {
    console.log("No published DEV.to URLs found in database.");
    return;
  }

  console.log(`Checking ${published.length} published DEV.to articles for 'noindex' meta tags...`);
  
  for (const art of published) {
    console.log(`\nArticle ID ${art.id}: "${art.topic}"`);
    console.log(`URL: ${art.devto_url}`);
    
    try {
      const response = await fetch(art.devto_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        console.log(`  [Error] Fetch failed with status: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      
      // Look for meta robots tags
      const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']robots["'][^>]*>/i);
                          
      if (robotsMatch) {
        console.log(`  [Robots Meta Found]: ${robotsMatch[0]}`);
        const content = robotsMatch[1].toLowerCase();
        if (content.includes('noindex')) {
          console.log(`  🔴 WARNING: This page is flagged as NOINDEX! (content="${robotsMatch[1]}")`);
        } else {
          console.log(`  🟢 CLEAN: Page is indexable. (content="${robotsMatch[1]}")`);
        }
      } else {
        console.log("  🟢 CLEAN: No meta robots tag found (defaults to indexable).");
      }
      
      // Look for canonical url
      const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
      if (canonicalMatch) {
        console.log(`  [Canonical URL]: ${canonicalMatch[1]}`);
      }
      
    } catch (err) {
      console.error(`  [Error] Failed to fetch: ${err.message}`);
    }
  }
}

main();
