export interface SEOMetadata {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
}

export function buildPageTitle(title: string, siteName = "PraveenTechWorld"): string {
  if (title === "Home") return siteName;
  return `${title} | ${siteName}`;
}

export function buildCanonical(site: string, path: string): string {
  const cleanSite = site.replace(/\/$/, "");
  const cleanPath = path.replace(/\/$/, "") || "";
  return `${cleanSite}${cleanPath}`;
}
