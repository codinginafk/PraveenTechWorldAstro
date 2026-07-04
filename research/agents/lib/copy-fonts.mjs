import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../../');
const FONTS_DEST = path.join(PROJECT_ROOT, 'public', 'fonts');

// Ensure destination folder exists
if (!fs.existsSync(FONTS_DEST)) {
  fs.mkdirSync(FONTS_DEST, { recursive: true });
}

const fontSources = [
  {
    pkg: 'plus-jakarta-sans',
    files: [
      'plus-jakarta-sans-latin-400-normal.woff2',
      'plus-jakarta-sans-latin-500-normal.woff2',
      'plus-jakarta-sans-latin-600-normal.woff2',
      'plus-jakarta-sans-latin-700-normal.woff2',
      'plus-jakarta-sans-latin-800-normal.woff2',
    ]
  },
  {
    pkg: 'jetbrains-mono',
    files: [
      'jetbrains-mono-latin-400-normal.woff2',
      'jetbrains-mono-latin-500-normal.woff2',
    ]
  }
];

let copiedCount = 0;

for (const source of fontSources) {
  const pkgDir = path.join(PROJECT_ROOT, 'node_modules', '@fontsource', source.pkg, 'files');
  if (!fs.existsSync(pkgDir)) {
    console.error(`Package directory not found: ${pkgDir}`);
    continue;
  }

  for (const filename of source.files) {
    const srcPath = path.join(pkgDir, filename);
    const destPath = path.join(FONTS_DEST, filename);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${filename}`);
      copiedCount++;
    } else {
      console.error(`Source file not found: ${srcPath}`);
    }
  }
}

console.log(`Successfully copied ${copiedCount} font files to ${FONTS_DEST}`);
