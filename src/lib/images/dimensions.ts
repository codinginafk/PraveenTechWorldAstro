import fs from "node:fs";
import path from "node:path";

export interface ImageDimensions {
  width: number;
  height: number;
}

const cache = new Map<string, ImageDimensions | null>();

/**
 * Read the intrinsic pixel size of a file served from `public/`.
 *
 * Cover images are declared in frontmatter as site-relative URLs
 * (`/images/generated/foo.jpg`), so nothing at build time knows their real
 * aspect ratio. The article template used to hard-code `width="800"
 * height="400"` (2.0:1) while the actual covers are ~1.79:1, which made the
 * hero grow by ~11% of its width after decode — a real layout shift on every
 * article. Reading the header once (cached) gives correct dimensions for the
 * hero `<img>`, the `og:image:*` tags and the JSON-LD ImageObject.
 *
 * Returns `null` for remote URLs, SVGs or anything unreadable; callers must
 * treat dimensions as optional.
 */
export async function getCoverImageDimensions(src?: string): Promise<ImageDimensions | null> {
  if (!src) return null;
  const clean = src.split("?")[0].split("#")[0];
  if (!clean.startsWith("/images/")) return null;
  if (clean.endsWith(".svg")) return null;

  const cached = cache.get(clean);
  if (cached !== undefined) return cached;

  let result: ImageDimensions | null = null;
  try {
    const filePath = path.join(process.cwd(), "public", clean.replace(/^\//, ""));
    const { default: sharp } = await import("sharp");
    const meta = await sharp(filePath).metadata();
    if (meta.width && meta.height) {
      result = { width: meta.width, height: meta.height };
    }
  } catch {
    result = null;
  }

  cache.set(clean, result);
  return result;
}

/**
 * Return the WebP sibling of a `public/` image if one has been generated.
 *
 * `scripts/generate-webp.mjs` writes a `.webp` next to every raster asset. We
 * only emit a <source> when the file actually exists: a <picture> whose <source>
 * 404s does not fall back to the <img>, it renders nothing, so the existence
 * check is what makes this safe on a live site.
 */
const webpCache = new Map<string, string | null>();

export function getWebpSibling(src?: string): string | null {
  if (!src) return null;
  const clean = src.split("?")[0].split("#")[0];
  if (!clean.startsWith("/images/") || !/\.(jpe?g|png)$/i.test(clean)) return null;

  const cached = webpCache.get(clean);
  if (cached !== undefined) return cached;

  const candidate = clean.replace(/\.(jpe?g|png)$/i, ".webp");
  let result: string | null = null;
  try {
    if (fs.existsSync(path.join(process.cwd(), "public", candidate.replace(/^\//, "")))) {
      result = candidate;
    }
  } catch {
    result = null;
  }
  webpCache.set(clean, result);
  return result;
}

/**
 * The 800px-wide WebP variant, if `npm run images:webp` has generated one.
 * A phone at 2x DPR needs ~780px, so serving the 1200–1400px cover wastes bytes.
 * Returns null when the variant is missing so callers fall back to one source.
 */
const smallCache = new Map<string, string | null>();

export function getWebpSmall(src?: string): string | null {
  if (!src) return null;
  const clean = src.split("?")[0].split("#")[0];
  if (!clean.startsWith("/images/") || !/\.(jpe?g|png)$/i.test(clean)) return null;

  const cached = smallCache.get(clean);
  if (cached !== undefined) return cached;

  const candidate = clean.replace(/\.(jpe?g|png)$/i, "-800w.webp");
  let result: string | null = null;
  try {
    if (fs.existsSync(path.join(process.cwd(), "public", candidate.replace(/^\//, "")))) {
      result = candidate;
    }
  } catch {
    result = null;
  }
  smallCache.set(clean, result);
  return result;
}
