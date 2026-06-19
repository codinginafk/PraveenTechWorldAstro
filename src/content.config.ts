import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const articles = defineCollection({
  loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(165),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    coverImage: z.string().optional(),
    imageAlt: z.string().optional(),
    imageCredit: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    canonical: z.string().url().optional(),
    socialHook: z.string().optional(),
    readingTime: z.number().optional(),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      )
      .optional(),
    references: z
      .array(
        z.object({
          title: z.string(),
          url: z.string().url(),
          author: z.string().optional(),
          publisher: z.string().optional(),
        })
      )
      .optional(),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: "**/[^_]*.yaml", base: "./src/content/authors" }),
  schema: z.object({
    name: z.string(),
    bio: z.string(),
    avatar: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().url().optional(),
  }),
});

const categories = defineCollection({
  loader: glob({ pattern: "**/[^_]*.yaml", base: "./src/content/categories" }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    icon: z.string().optional(),
    order: z.number().default(0),
  }),
});

const tags = defineCollection({
  loader: glob({ pattern: "**/[^_]*.yaml", base: "./src/content/tags" }),
  schema: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { articles, authors, categories, tags };
