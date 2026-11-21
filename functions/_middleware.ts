// Cloudflare Pages Edge Middleware
// Executes at the Cloudflare Edge on every request before static assets

interface PagesContext {
  request: Request;
  next: () => Promise<Response>;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);

  // 1. Force www canonical hostname
  if (url.hostname === "praveentechworld.com") {
    url.hostname = "www.praveentechworld.com";
    return Response.redirect(url.toString(), 301);
  }

  let shouldRedirect = false;

  // 2. Strip legacy Blogger mobile parameter (?m=1, ?m=0)
  if (url.searchParams.has("m")) {
    url.searchParams.delete("m");
    shouldRedirect = true;
  }

  // 3. Map legacy Blogger contact pages
  if (url.pathname === "/p/contact-us.html" || url.pathname === "/p/contact-us") {
    url.pathname = "/contact";
    shouldRedirect = true;
  }

  // 4. Strip explicit .html extension from content URLs (Clean URL normalization)
  if (url.pathname.endsWith(".html") && !url.pathname.startsWith("/api/")) {
    url.pathname = url.pathname.slice(0, -5);
    shouldRedirect = true;
  }

  // If any normalization rule matched, return a single-hop 301 redirect
  if (shouldRedirect) {
    const cleanDestination = url.search
      ? `${url.origin}${url.pathname}${url.search}`
      : `${url.origin}${url.pathname}`;
    return Response.redirect(cleanDestination, 301);
  }

  return context.next();
}
