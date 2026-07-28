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
  const homepageTitle = "PraveenTechWorld — Practical AI Workflows & IT Guides";
  if (title === "Home" || title.includes("PraveenTechWorld")) return title;
  if (title.length > 52) return title;
  return `${title} | PTW`;
}

export function buildCanonical(site: string, path: string): string {
  const cleanSite = site.replace(/\/$/, "");
  const cleanPath = path.replace(/\.html$/, "").replace(/\/$/, "") || "";
  return cleanPath === "/index" ? cleanSite : `${cleanSite}${cleanPath}`;
}
