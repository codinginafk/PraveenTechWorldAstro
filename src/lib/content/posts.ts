import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

type Article = CollectionEntry<"articles">;

export async function getPublishedArticles(): Promise<Article[]> {
  const articles = await getCollection("articles");
  const now = new Date();
  return articles
    .filter((a) => !a.data.draft)
    .filter((a) => new Date(a.data.publishDate) <= now)
    .sort(
      (a, b) =>
        new Date(b.data.publishDate).getTime() -
        new Date(a.data.publishDate).getTime()
    );
}

export async function getArticlesByCategory(
  category: string
): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.filter((a) => a.data.category === category);
}

export async function getArticlesByTag(tag: string): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.filter((a) => a.data.tags.includes(tag));
}

export async function getFeaturedArticles(): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.filter((a) => a.data.featured);
}

export async function getRelatedArticles(
  article: Article,
  limit = 3
): Promise<Article[]> {
  const all = await getPublishedArticles();
  const sameCategory = all.filter(
    (a) =>
      a.data.category === article.data.category && a.id !== article.id
  );
  const sameTags = all.filter(
    (a) =>
      a.id !== article.id &&
      a.data.tags.some((t) => article.data.tags.includes(t))
  );
  const related = [...sameCategory, ...sameTags];
  const seen = new Set<string>();
  const unique = related.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
  return unique.slice(0, limit);
}

export async function getLatestArticles(limit = 6): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.slice(0, limit);
}

export async function getAllCategories(): Promise<string[]> {
  const articles = await getPublishedArticles();
  return [...new Set(articles.map((a) => a.data.category))];
}

export async function getAllTags(): Promise<string[]> {
  const articles = await getPublishedArticles();
  const tagSet = new Set<string>();
  articles.forEach((a) => a.data.tags.forEach((t) => tagSet.add(t)));
  return [...tagSet].sort();
}
