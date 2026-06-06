import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, "../../..");
export const DIST_DIR = path.join(ROOT_DIR, "dist");
export const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");

export const SEO_CONFIG = {
  siteUrl: "https://www.praveentechworld.com",

  distDir: DIST_DIR,
  articlesDir: ARTICLES_DIR,

  titleMin: 15,
  titleMax: 60,
  descMin: 120,
  descMax: 160,
  minWordCount: 300,
  idealWordCount: 1500,

  minInternalLinks: 2,
  maxImageSizeKB: 200,

  excludedPatterns: [/\/tag\//, /\/category\//, /\/pagefind\//],
  excludedPaths: ["/search", "/tag/", "/category/", "/404"],

  severity: { CRITICAL: "CRITICAL", HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW" },
};

export function isExcluded(urlPath) {
  return SEO_CONFIG.excludedPatterns.some((p) => p.test(urlPath));
}
