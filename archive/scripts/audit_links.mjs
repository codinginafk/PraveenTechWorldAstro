import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');

// Simple helper to check URL
function checkUrl(urlStr) {
    return new Promise((resolve) => {
        try {
            const url = new URL(urlStr);
            const client = url.protocol === 'https:' ? https : http;
            
            const req = client.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    resolve({ ok: true, status: res.statusCode });
                } else {
                    resolve({ ok: false, status: res.statusCode });
                }
            });

            req.on('error', (err) => {
                resolve({ ok: false, status: err.message });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({ ok: false, status: 'timeout' });
            });

            req.end();
        } catch (err) {
            resolve({ ok: false, status: 'invalid url' });
        }
    });
}

async function auditLinks() {
    const files = await fs.readdir(ARTICLES_DIR);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));
    
    let allLinks = new Set();
    const fileLinkMap = {};

    console.log("Scanning files for external links...");
    for (const file of mdxFiles) {
        const filePath = path.join(ARTICLES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Find markdown links [text](http...)
        const regex = /\[[^\]]+\]\((https?:\/\/[^)]+)\)/g;
        let match;
        
        fileLinkMap[file] = [];
        
        while ((match = regex.exec(content)) !== null) {
            const url = match[1];
            // ignore internal absolute paths or relative paths if they somehow match, but we forced https?
            allLinks.add(url);
            fileLinkMap[file].push(url);
        }
    }

    console.log(`Found ${allLinks.size} unique external links. Validating...`);
    
    const results = {};
    let checked = 0;
    
    // Check concurrently in batches of 10
    const urls = Array.from(allLinks);
    const batchSize = 10;
    
    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        await Promise.all(batch.map(async (url) => {
            results[url] = await checkUrl(url);
            checked++;
            if (checked % 10 === 0) console.log(`Checked ${checked}/${urls.length}...`);
        }));
    }

    // Report
    let broken = 0;
    for (const [url, res] of Object.entries(results)) {
        if (!res.ok) {
            console.log(`\n❌ BROKEN LINK: ${url} (Status: ${res.status})`);
            // Find which files contain it
            const foundIn = Object.entries(fileLinkMap)
                .filter(([_, links]) => links.includes(url))
                .map(([file, _]) => file);
            console.log(`   Found in: ${foundIn.join(', ')}`);
            broken++;
        }
    }

    console.log(`\nValidation complete. ${urls.length - broken} OK, ${broken} Broken.`);
    
    await fs.writeFile(
        path.resolve(__dirname, 'link_audit_report.json'), 
        JSON.stringify({ results, fileLinkMap }, null, 2)
    );
}

auditLinks().catch(console.error);
