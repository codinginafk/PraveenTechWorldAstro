# Quality Gates Checklist — Every New Article Must Pass

## Before Writing

- [ ] Pick a topic with real search demand (not what you *think* is interesting)
- [ ] Find 3+ existing articles on this site to link to internally
- [ ] Research real statistics, studies, and data points to cite
- [ ] Choose a unique angle — don't write the same article everyone else has

## Frontmatter (Metadata)

| Rule | Requirement | Why |
|------|------------|-----|
| **seoTitle** | ≤50 chars | So with " \| PTW" suffix total ≤60 for Google |
| **description** | 120-155 chars | Must include primary keyword in **first 20 chars** |
| **socialHook** | 50-150 chars | Used for LinkedIn, Twitter, Medium posts |
| **tags** | 3-6, lowercase | Max 6 or Google sees keyword stuffing |
| **imageAlt** | ≥10 chars, descriptive | Required for accessibility + SEO |
| **author** | `praveen` | Must match filename in `src/content/authors/` |
| **category** | One of the 10 existing | Must match a `src/content/categories/*.yaml` file |
| **coverImage** | Valid Unsplash URL | `https://images.unsplash.com/photo-XXXXX?w=1200&h=600&fit=crop` |

## Content Quality

| Rule | Requirement | Why |
|------|------------|-----|
| **Readability** | Grade 8-9 (Flesch-Kincaid) | Google prefers content everyone can read |
| **Body length** | ≥2,500 words (aim for 3,000+) | Longer content ranks better |
| **First paragraph** | Must contain a specific data point OR personal story | "In today's world..." = instant fail |
| **Primary keyword** | In first 20 chars of description, first 100 words of body, AND an H2 heading | Keyword placement matters for ranking |
| **Internal links** | ≥3 per article | Links to other articles so Google sees site structure |
| **External citations** | ≥3 per article | Links to real sources so Google can verify claims |
| **Paragraphs** | Max 5 sentences each | Walls of text = high bounce rate |
| **Sentence variety** | No 3+ consecutive sentences with same length | Reads more naturally |
| **Active voice** | ≥80% | Passive voice is weaker |
| **Generic link text** | Never use "click here", "read more", "this article" | Wastes link equity |
| **FAQ section** | 3-5 questions at bottom | Boosts featured snippet chances |

## Technical SEO

| Rule | Requirement | Why |
|------|------------|-----|
| **Heading hierarchy** | H1 → H2 → H3 (no skipping) | Google reads headings as outline |
| **No broken links** | All internal URLs must resolve | 404s kill trust |
| **publishDate** | Valid date string | Required for schema markup |

## Before Publishing

1. Run `node research/agents/lib/quality-gates.mjs validate-all` — fix ALL failures
2. Run `npx astro build` — fix ALL build errors
3. If score < 85/100, rewrite until it passes
4. Commit and push to trigger Vercel deploy
5. Verify article is live on production URL

## Red Lines (Instant Reject)

These fail no matter what the rest of the article looks like:

- ❌ seoTitle > 50 chars OR title tag > 60 chars total
- ❌ Zero internal links
- ❌ Zero external citations
- ❌ Readability Grade 10+ or 7-
- ❌ Body < 2,000 words
- ❌ AI-generated fluff — "In the ever-evolving landscape..."
- ❌ No personal hook or data in first paragraph
- ❌ More than 6 tags
- ❌ Any broken internal link
