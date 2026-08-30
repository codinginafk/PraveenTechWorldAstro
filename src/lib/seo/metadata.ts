export interface SEOMetadata {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  noindex?: boolean;
}

export function buildPageTitle(title: string): string {
  if (!title) return "PraveenTechWorld";
  let clean = title.trim();
  if (clean === "Home" || clean.includes("PraveenTechWorld")) {
    return clean;
  }
  clean = clean.replace(/\s*\|\s*PTW$/i, "").trim();
  if (clean.length <= 50) {
    const withSuffix = `${clean} | PTW`;
    return withSuffix;
  }

  // Do not hard-cut article titles. A character-count cap can split a word
  // (for example, "Install" → "Inst") and damage the query intent in the
  // browser title, social previews, and structured metadata. Search engines
  // can shorten long titles visually when needed; the source metadata should
  // remain human-readable and complete.
  return clean;
}

export function buildCanonical(site: string, path: string): string {
  const cleanSite = site.replace(/\/$/, "");
  const cleanPath = path.replace(/\.html$/, "").replace(/\/$/, "") || "";
  return cleanPath === "/index" ? cleanSite : `${cleanSite}${cleanPath}`;
}
