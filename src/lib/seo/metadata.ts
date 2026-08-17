export interface SEOMetadata {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
}

const SUFFIX = " | PTW";

export function buildPageTitle(title: string): string {
  if (!title) return "PraveenTechWorld";
  let clean = title.trim();
  if (clean === "Home" || clean.includes("PraveenTechWorld")) {
    return clean.length > 58 ? clean.slice(0, 58) : clean;
  }
  clean = clean.replace(/\s*\|\s*PTW$/i, "").trim();
  if (clean.length <= 50) {
    const withSuffix = `${clean} | PTW`;
    return withSuffix.length <= 58 ? withSuffix : clean;
  }
  return clean.length > 58 ? clean.slice(0, 58) : clean;
}

export function buildCanonical(site: string, path: string): string {
  const cleanSite = site.replace(/\/$/, "");
  const cleanPath = path.replace(/\.html$/, "").replace(/\/$/, "") || "";
  return cleanPath === "/index" ? cleanSite : `${cleanSite}${cleanPath}`;
}
