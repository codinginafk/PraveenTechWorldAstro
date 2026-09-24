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
  redirects: {
    "/research": "/research/degoogle-telemetry-2026",
    "/blog/best-password-manager-for-small-business-2026": "/blog/best-password-managers-in-2026-security-features-and-pricing-compared",
    "/blog/how-to-fix-windows-11-update-error-0x800f081f": "/blog/fix-windows-11-update-errors-2026-troubleshooting",
    "/2026/01/Top-Blogger-Themes-in-2026-And-the-Only-Clean-Install-Hack-You-Need.html": "/blog",
    "/2026/02/The-Curiosity-Crisis-AI-Is-Raising-a-Generation-of-Loners.html": "/blog",
    "/2026/01/Does-Reinstalling-Windows-Actually-Fix-Problems.html": "/blog/does-resetting-windows-remove-viruses-completely",
    "/p/contact-us.html": "/contact",
    "/blog/android-battery-draining-after-update-7-fixes-that-work": "/blog/android-battery-draining-fast-after-update-7-proven-fixes-for-2026",
    "/blog/android-battery-draining-fast-after-update-7-proven-fixes-complete-guide": "/blog/android-battery-draining-fast-after-update-7-proven-fixes-for-2026",
    "/blog/android-battery-drain-after-update": "/blog/android-battery-draining-fast-after-update-7-proven-fixes-for-2026",
    "/blog/android-17-battery-drain": "/blog/android-17-battery-drain-overheating-fix-pixel-guide",
    "/blog/does-reinstalling-windows-remove-viruses": "/blog/does-resetting-windows-remove-viruses-completely",
    "/blog/does-resetting-windows-remove-viruses": "/blog/does-resetting-windows-remove-viruses-completely",
    "/blog/does-fresh-install-of-windows-get-rid-of-viruses": "/blog/does-resetting-windows-remove-viruses-completely",
    "/blog/removes-viruses-windows-reset": "/blog/does-resetting-windows-remove-viruses-completely",
    "/blog/why-windows-11-24h2-bsods-on-weed-hmb-fix": "/blog/why-windows-11-24h2-bsods-on-wd-nvme-hmb-fix",
    "/blog/11-volume": "/blog/windows-11-volume-control-not-working-8-proven-fixes-for-2026",
    "/blog/windows-11-volume-control": "/blog/windows-11-volume-control-not-working-8-proven-fixes-for-2026",
    "/blog/best-password-managers-in-2026-security-price-and-ease-of-use": "/blog/best-password-managers-in-2026-security-features-and-pricing-compared",
    "/blog/will-reinstalling-windows-fix-your-slow-internet-after-update-kb5089573": "/blog/windows-11-kb5089573-update-errors-slow-internet-fix",
    "/blog/ai-in-higher-education-protecting-student-data-privacy": "/blog/data-protection-for-universities-compliance-and-security-guide",
    "/blog/ai-in-higher-education-protecting-student-data-privacy-essential-tips-and-regula": "/blog/data-protection-for-universities-compliance-and-security-guide",
    "/blog/ai-to-automate-office-work-in-1218-months-microsofts-ceo-predictions-and-practic": "/blog/ai-to-automate-office-work-microsoft-ceo-predictions",
    "/blog/best-free-alternatives-to-paid-software-in-2026-i-tested-40-apps": "/blog/best-free-alternatives-to-paid-software-in-2026-complete-comparison",
    "/blog/best-free-vpns-in-2026-i-tested-15-so-you-don-t-have-to": "/blog/best-free-vpn-services-in-2026-complete-comparison-and-privacy-guide",
    "/blog/chatgpt-for-small-business-how-to-use-ai-to-save-time": "/blog/how-to-use-ai-to-write-emails-that-get-replies-2026-guide",
    "/blog/how-to-enable-google-search-console-for-your-website": "/blog/how-to-add-your-website-to-google-search-step-by-step-guide",
    "/blog/how-to-fix-windows-11-update-errors-in-2026-step-by-step-troubleshooting-guide": "/blog/fix-windows-11-update-errors-2026-troubleshooting",
    "/blog/how-to-set-up-google-search-console-for-your-new-website": "/blog/how-to-add-your-website-to-google-search-step-by-step-guide",
    "/blog/i-am-not-a-developer-i-built-a-database-audit-script-with-deepseek-here-is-where": "/blog/non-developer-built-database-audit-script-with-deepseek",
    "/blog/i-automated-server-health-checks-with-deepseek-the-script-that-saved-my-weekend": "/blog/automated-server-health-checks-with-deepseek",
    "/blog/windows-11-kb5089549-update-how-to-enable-xbox-mode-and-fix-file-explorer-white-flash": "/blog/windows-11-kb5089549-enable-xbox-mode-fix-white-flash",
    "/blog/google-analytics-4-help-common-problems-solutions": "/blog/ga4-not-tracking-visitors-12-troubleshooting-steps",
    "/blog/google-analytics-4-events-tracking-complete-guide": "/blog/ga4-events-automatic-recommended-custom-tracking-guide",
    "/blog/what-are-authority-domains-and-how-to-build-them": "/blog/what-is-domain-authority-and-how-to-improve-it-in-2026",
    "/blog/google-analytics-4-strategy-for-website-growth": "/blog/how-to-use-google-analytics-4-to-improve-your-content-strategy",
    "/services/bur-dubai": "/contact",
    "/services/dubai": "/contact",
    "/services/karama": "/contact",
    "/blog/best-it-and-seo-expert-in-dubai-freelance-guide": "/contact",
    "/blog/how-i-rank-bur-dubai-and-karama-businesses-on-google": "/contact",
    "/blog/why-karama-and-bur-dubai-businesses-choose-freelance-growth-engineers": "/contact",
    "/blog/why-dubai-customers-ignore-contact-us-forms-and-text-on-whatsapp": "/contact",
    "/blog/google-business-profile-video-verification-dubai": "/contact",
    "/blog/tiktok-vs-whatsapp-vs-instagram-which-social-platform-dominates-dubai": "/blog",
    "/blog/how-i-automated-tls-certificate-renewal-with-deepseek-and-why-it-almost-broke-pr": "/blog/automated-tls-certificate-renewal-with-deepseek",
    "/blog/automate-your-daily-workflow-in-2026-free-tools-and-real-examples": "/blog/how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide",
    "/blog/how-to-fix-windows-11-update-errors-in-2026-complete-troubleshooting-guide": "/blog/fix-windows-11-update-errors-2026-troubleshooting",
    "/blog/sitemap-urls-are-blocked-by-robotstxt-clean-up-your-sitemap-and-resubmit-it-in-g": "/blog/how-to-fix-sitemap-errors-in-google-search-console",
    "/blog/ga4-shows-realtime-users-but-standard-reports-stay-blank-fix-event-processing-an": "/blog/ga4-shows-realtime-users-but-reports-blank-fix-processing",
    "/blog/chrome-removes-ai-privacy-wording-what-googles-on-device-data-claim-means-for-us": "/blog/chrome-removes-ai-privacy-wording-google-on-device-data",
    "/blog/post-8/": "/blog",
    "/blog/post-5/": "/blog",
    "/categories/youtube/": "/blog",
    "/p/contact-us": "/contact",
    "/2026/01/Top-Blogger-Themes-in-2026-And-the-Only-Clean-Install-Hack-You-Need": "/blog",
    "/2026/02/The-Curiosity-Crisis-AI-Is-Raising-a-Generation-of-Loners": "/blog",
    "/blog/website-speed-optimization-why-it-matters-for-seo-and-how-to-fix-it": "/blog/website-speed-upgrades-fix-crawling-delays-and-core-web-vitals",
    "/blog/will-reinstalling-windows-fix-slow-performance-issues": "/blog/does-resetting-windows-remove-viruses-completely",
    "/blog/will-reinstalling-windows-fix-blue-screen-errors": "/blog/does-resetting-windows-remove-viruses-completely",
    "/blog/will-factory-resetting-windows-fix-corrupted-user-profile": "/blog/does-resetting-windows-remove-viruses-completely",
    "/blog/why-32k-context-crashes-llama-3-gpu-vram-fix": "/blog/why-32k-context-crashes-local-llm-vram-kv-cache-fix",
    "/blog/how-to-add-your-website-to-google-search": "/blog/how-to-add-your-website-to-google-search-step-by-step-guide",
    "/blog/how-to-fix-nvlddmkm-event-id-153-gpu-crash": "/blog/how-to-fix-nvlddmkm-event-id-153-gpu-crashes",
    "/blog/how-to-fix-splwow64-0xc0000142-error": "/blog/how-to-fix-splwow64-0xc0000142-error-32-bit-printing",
    "/blog/how-to-fix-nvlddmkm-sys-event-id-13": "/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11",
    "/blog/how-to-fix-kmode-exception-not-handled-0x1e-windows-11": "/blog/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen",
    "/blog/how-to-fix-ga4-event-tracking-errors": "/blog/ga4-events-automatic-recommended-custom-tracking-guide",
    "/blog/why-you-dont-have-gemini-spark-mode-yet-access-guide": "/blog/google-gemini-spark-mode-features-guide",
    "/blog/understanding-sitemap-indexing-fix-crawling-issues": "/blog/how-to-fix-sitemap-errors-in-google-search-console",
    "/blog/sitemap-urls-blocked-by-robotstxt-clean-and-resubmit": "/blog/how-to-fix-sitemap-errors-in-google-search-console",
    "/blog/sitemap-submitted-but-pages-undiscovered-robotstxt-check": "/blog/how-to-fix-google-indexing-errors-crawled-not-indexed",
    "/blog/how-to-use-google-analytics-4-to-improve-your-content-strategy": "/blog/ga4-not-tracking-visitors-12-troubleshooting-steps",
    "/blog/ga4-traffic-looks-wrong-check-consent-mode-and-filters": "/blog/ga4-not-tracking-visitors-12-troubleshooting-steps",
    "/blog/ga4-data-delayed-or-missing-check-measurement-id-consent": "/blog/ga4-not-tracking-visitors-12-troubleshooting-steps",
  },
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
        !page.startsWith("https://www.praveentechworld.com/guides/productivity") &&
        !page.startsWith("https://www.praveentechworld.com/guest-post") &&
        !page.startsWith("https://www.praveentechworld.com/author/abduldiyan") &&
        !page.startsWith("https://www.praveentechworld.com/author/satyam") &&
        !page.endsWith("/rss.xml") &&
        !page.endsWith("/rss") &&
        !page.endsWith("/portfolio"),
    }),
    pagefind(),
  ],
  markdown: {
    processor: unified({ rehypePlugins: [rehypeExternalLinks] }),
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    },
  },
});
