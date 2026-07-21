import { ARTICLES_BY_NICHE, getArticleUrl, AUTHOR_NAME, AUTHOR_TITLE, SITE_URL } from "./targets.mjs";

// Picks best matching article for a target based on niche
export function pickArticle(target) {
  const niche = target.niche || "tech";
  const articles = ARTICLES_BY_NICHE[niche] || ARTICLES_BY_NICHE.tech;
  return articles[0]; // return the best match
}

// Generates pitch text for a target
export function generatePitch(target) {
  const article = pickArticle(target);
  const articleUrl = getArticleUrl(article.url);

  const templates = {
    generic: `Hi ${target.name} Editorial Team,

I'm an IT Ops Lead who writes practical, step-by-step technical guides based on real troubleshooting experience. I'd love to contribute a guest post to your blog.

I'm proposing: "${target.pitchAngle}" — a hands-on guide drawn from my work ${target.pitchTopic.toLowerCase()}.

You can see my writing style at ${articleUrl}

Would you be open to reviewing a draft?

Best regards,
${AUTHOR_NAME}
${AUTHOR_TITLE}
${SITE_URL}`,

    windows: `Hi ${target.name} Editorial Team,

I've been following your Windows/IT content and noticed your audience deals with the same troubleshooting issues I handle daily as an IT Ops Lead.

I'd like to pitch a guest post: "${target.pitchAngle}" — a practical guide based on my experience helping users fix these exact problems.

Here's a sample of my writing style: ${articleUrl}

Let me know if you'd like me to send a complete draft.

Best regards,
${AUTHOR_NAME}
${AUTHOR_TITLE}
${SITE_URL}`,

    techblog: `Hi ${target.name} Team,

I'm an IT Ops Lead and write detailed technical guides that help sysadmins and power users solve real problems.

I'd love to write for your audience on: "${target.pitchAngle}"

My articles are hands-on, step-by-step, and tested before publishing. See my style here: ${articleUrl}

Happy to tailor this to your audience's preferences.

Best regards,
${AUTHOR_NAME}
${AUTHOR_TITLE}
${SITE_URL}`,
  };

  // Pick template based on niche
  let key = "generic";
  if (target.niche === "windows-it") key = "windows";
  if (target.niche === "tech" || target.niche === "dev" || target.niche === "linux") key = "techblog";

  return {
    text: templates[key],
    article,
  };
}
