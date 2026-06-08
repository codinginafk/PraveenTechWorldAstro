import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = parseInt(process.argv[2] || "3000");

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
};

http.createServer((req, res) => {
  // Clean URL support: /blog → /blog.html
  let urlPath = req.url.split("?")[0];
  if (urlPath.endsWith("/")) urlPath = urlPath.slice(0, -1);
  let filePath = path.join(DIST, urlPath === "" ? "index.html" : urlPath);
  // Try with .html extension for clean URLs
  if (!path.extname(filePath)) {
    const htmlPath = filePath + ".html";
    if (fs.existsSync(htmlPath)) filePath = htmlPath;
  }
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found: " + filePath);
    } else {
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    }
  });
}).listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
