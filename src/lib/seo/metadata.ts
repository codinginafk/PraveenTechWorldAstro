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
  if (title === "Home") return "PraveenTechWorld";
  const full = title + SUFFIX;
  if (full.length <= 60) return full;
  const maxTitleLen = 60 - SUFFIX.length - 3;
  return title.slice(0, maxTitleLen) + "..." + SUFFIX;
}

export function buildCanonical(site: string, path: string): string {
  const cleanSite = site.replace(/\/$/, "");
  const cleanPath = path.replace(/\.html$/, "").replace(/\/$/, "") || "";
  return cleanPath === "/index" ? cleanSite : `${cleanSite}${cleanPath}`;
}
