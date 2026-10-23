import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import pagefind from "astro-pagefind";
import tailwindcss from "@tailwindcss/vite";

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
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        !page.startsWith("https://www.praveentechworld.com/tag") &&
        !page.startsWith("https://www.praveentechworld.com/tags") &&
        !page.startsWith("https://www.praveentechworld.com/category") &&
        !page.startsWith("https://www.praveentechworld.com/categories") &&
        !page.startsWith("https://www.praveentechworld.com/services") &&
        !page.startsWith("https://www.praveentechworld.com/demo") &&
        !page.startsWith("https://www.praveentechworld.com/search") &&
        !page.startsWith("https://www.praveentechworld.com/guides/business") &&
        !page.startsWith("https://www.praveentechworld.com/guides/career-growth") &&
        !page.startsWith("https://www.praveentechworld.com/guides/hosting-infra") &&
        !page.startsWith("https://www.praveentechworld.com/tag/productivity") &&
        !page.startsWith("https://www.praveentechworld.com/guest-post") &&
        !page.startsWith("https://www.praveentechworld.com/author/abduldiyan") &&
        !page.startsWith("https://www.praveentechworld.com/author/satyam") &&
        !page.endsWith("/rss.xml") &&
        !page.endsWith("/rss") &&
        !page.endsWith("/portfolio"),
    }),
    // One indexing pass. The integration indexes dist/ on `astro:build:done`,
    // and a trailing `npx pagefind --site dist` in package.json indexed the same
    // 640 pages a second time (~35 s per build) while warning that it could not
    // find a data-pagefind-body element. Feeding pagefind.yml's exclude_selectors
    // here keeps nav/footer chrome out of the index the integration writes, which
    // was the only thing the second pass added.
    pagefind({
      indexConfig: {
        exclude_selectors: ["nav", "footer", ".sidebar", ".skip-link"],
      },
    }),
  ],
  markdown: {
    processor: unified({ rehypePlugins: [rehypeExternalLinks] }),
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    },
  },
});
