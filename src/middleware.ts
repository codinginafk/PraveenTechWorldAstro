import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
  const url = new URL(context.request.url);

  // Strip legacy Blogger ?m=1 query parameter
  if (url.searchParams.has("m")) {
    url.searchParams.delete("m");
    if (url.pathname === "/p/contact-us.html" || url.pathname === "/p/contact-us") {
      url.pathname = "/contact";
    }
    return context.redirect(url.toString(), 301);
  }

  // Handle legacy contact path
  if (url.pathname === "/p/contact-us.html" || url.pathname === "/p/contact-us") {
    return context.redirect("/contact", 301);
  }

  return next();
});
