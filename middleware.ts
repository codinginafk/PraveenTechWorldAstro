// Vercel Edge Middleware to strip legacy Blogger ?m=1 query strings site-wide
export default function middleware(request: Request) {
  const url = new URL(request.url);

  // 1. Handle legacy Blogger ?m=1 or ?m=0 queries
  if (url.searchParams.has("m")) {
    url.searchParams.delete("m");

    // If path is legacy Blogger contact page, redirect to /contact
    if (url.pathname === "/p/contact-us.html" || url.pathname === "/p/contact-us") {
      url.pathname = "/contact";
    }

    return Response.redirect(url.toString(), 301);
  }

  // 2. Direct legacy /p/contact-us.html to /contact
  if (url.pathname === "/p/contact-us.html" || url.pathname === "/p/contact-us") {
    url.pathname = "/contact";
    return Response.redirect(url.toString(), 301);
  }
}

export const config = {
  matcher: "/:path*",
};
