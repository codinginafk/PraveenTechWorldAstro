import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import pagefind from "astro-pagefind";

function rehypeExternalLinks() {
  return (tree) => {
    function visit(node) {
      if (node.type === "element" && node.tagName === "a" && node.properties && node.properties.href) {
        const href = String(node.properties.href);
        if (href.startsWith("http://") || href.startsWith("https://")) {
          if (!href.includes("praveentechworld.com")) {
            node.properties.rel = ["nofollow", "noopener", "noreferrer"];
            node.properties.target = "_blank";
          }
        }
      }
      if (node.children) {
        node.children.forEach(visit);
      }
    }
    visit(tree);
  };
}

export default defineConfig({
  site: "https://www.praveentechworld.com",
  trailingSlash: "never",
  build: {
    format: "directory",
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        !page.startsWith("https://www.praveentechworld.com/category/") &&
        !page.startsWith("https://www.praveentechworld.com/contact") &&
        !page.startsWith("https://www.praveentechworld.com/privacy") &&
        !page.startsWith("https://www.praveentechworld.com/author") &&
        !page.startsWith("https://www.praveentechworld.com/demo") &&
        !page.endsWith("/rss.xml") &&
        !page.endsWith("/rss"),
    }),
    pagefind(),
  ],
  markdown: {
    rehypePlugins: [rehypeExternalLinks],
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    },
  },
});
