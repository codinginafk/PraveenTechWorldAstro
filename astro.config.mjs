import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import pagefind from "astro-pagefind";
import vercel from "@astrojs/vercel/static";

export default defineConfig({
  adapter: vercel(),
  site: "https://www.praveentechworld.com",
  trailingSlash: "never",
  build: {
    format: "file",
  },
  integrations: [mdx(), sitemap({
    filter: (page) => !page.startsWith("https://www.praveentechworld.com/tag/") && !page.startsWith("https://www.praveentechworld.com/category/"),
    lastmod: new Date(),
  }), pagefind()],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    },
  },
});
