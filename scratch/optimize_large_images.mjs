import fs from "fs";
import path from "path";
import sharp from "sharp";

const dirs = ["public/images/generated", "public/images/articles"];

console.log("=== COMPRESSING LARGE IMAGES WITH SHARP ===");

async function optimizeImages() {
  let totalSavedBytes = 0;
  let processedCount = 0;

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);

    for (const file of files) {
      if (/\.(jpg|jpeg|png)$/i.test(file)) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        // Only compress if file size is > 200KB
        if (stats.size > 200 * 1024) {
          const tempPath = filePath + ".tmp";

          try {
            await sharp(filePath)
              .resize({ width: 1200, withoutEnlargement: true })
              .jpeg({ quality: 80, progressive: true, mozjpeg: true })
              .toFile(tempPath);

            const newStats = fs.statSync(tempPath);
            const savedBytes = stats.size - newStats.size;

            if (savedBytes > 0) {
              fs.renameSync(tempPath, filePath);
              totalSavedBytes += savedBytes;
              console.log(`⚡ Compressed ${file}: ${(stats.size / 1024).toFixed(0)}KB -> ${(newStats.size / 1024).toFixed(0)}KB (Saved ${(savedBytes / 1024).toFixed(0)}KB)`);
              processedCount++;
            } else {
              fs.unlinkSync(tempPath);
            }
          } catch (err) {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            console.error(`Failed to compress ${file}:`, err.message);
          }
        }
      }
    }
  }

  console.log(`\nOptimization Complete. Compressed ${processedCount} images. Total space saved: ${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB.`);
}

optimizeImages();
