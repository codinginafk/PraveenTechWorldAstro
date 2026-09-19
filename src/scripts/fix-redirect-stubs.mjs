import fs from "fs";
import path from "path";

const DIST_DIR = path.resolve(process.cwd(), "dist");

function walkHtmlFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtmlFiles(fullPath, fileList);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function fixRedirectStubs() {
  if (!fs.existsSync(DIST_DIR)) {
    console.log("[fix-redirect-stubs] No dist directory found. Skipping.");
    return;
  }

  const htmlFiles = walkHtmlFiles(DIST_DIR);
  let fixedCount = 0;

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, "utf8");

    // Check if this is an Astro static redirect stub
    if (content.includes('http-equiv="refresh"') && !content.includes("<head>")) {
      // Extract target url and parts
      const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : "Redirecting...";

      const refreshMatch = content.match(/<meta\s+http-equiv="refresh"\s+content="([^"]+)"/i);
      const refreshContent = refreshMatch ? refreshMatch[1] : "0;url=/";

      const canonicalMatch = content.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
      const canonicalHref = canonicalMatch ? canonicalMatch[1] : "/";

      const bodyMatch = content.match(/<body>([\s\S]*?)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1].trim() : `<a href="${canonicalHref}">Redirecting...</a>`;

      const wrappedHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <meta http-equiv="refresh" content="${refreshContent}">
    <meta name="robots" content="noindex">
    <link rel="canonical" href="${canonicalHref}">
  </head>
  <body>
    ${bodyContent}
  </body>
</html>`;

      fs.writeFileSync(file, wrappedHtml, "utf8");
      fixedCount++;
    }
  }

  console.log(`[fix-redirect-stubs] Wrapped ${fixedCount} redirect stubs with valid <html lang="en"><head> wrappers.`);
}

fixRedirectStubs();
