import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import pagefind from "astro-pagefind";

export default defineConfig({
  site: "https://www.praveentechworld.com",
  trailingSlash: "never",
  build: {
    format: "file",
  },
  integrations: [mdx(), sitemap({
    filter: (page) => !page.startsWith("https://www.praveentechworld.com/tag/") && !page.startsWith("https://www.praveentechworld.com/category/"),
  }), pagefind()],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    },
  },
});
