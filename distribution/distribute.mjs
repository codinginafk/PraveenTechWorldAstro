import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const [cmd, slug] = process.argv.slice(2);

async function main() {
  if (!cmd || !slug) {
    console.log(`
Usage: node distribution/distribute.mjs <platform> <article-slug>

Platforms:
  linkedin      Generate LinkedIn post
  instagram     Generate Instagram carousel
  tiktok        Generate TikTok script
  newsletter    Generate newsletter email
  all           Generate all of the above

Examples:
  node distribution/distribute.mjs linkedin learn-excel-faster-using-chatgpt
  node distribution/distribute.mjs all travelers
      `);
    return;
  }

  const platforms = cmd === "all"
    ? ["linkedin", "instagram", "tiktok", "newsletter"]
    : [cmd];

  for (const platform of platforms) {
    let gen;
    try {
      gen = await import(`./${platform}.mjs`);
    } catch (err) {
      console.error(`Failed to import ${platform}: ${err.message}`);
      continue;
    }

    const fnName = {
      linkedin: "generateLinkedInPost",
      instagram: "generateInstagramCarousel",
      tiktok: "generateTikTokScript",
      newsletter: "generateNewsletterEmail",
    }[platform];

    if (gen[fnName]) {
      console.log(`\n--- Generating ${platform} content ---`);
      await gen[fnName](slug);
    }
  }
}

main().catch(console.error);
