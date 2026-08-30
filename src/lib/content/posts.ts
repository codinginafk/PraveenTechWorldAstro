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
  return all
    .filter((candidate) => candidate.id !== article.id)
    .map((candidate) => {
      const sharedTags = candidate.data.tags.filter((tag) =>
        article.data.tags.includes(tag)
      ).length;
      const sameCategory = candidate.data.category === article.data.category;
      const candidateDate = new Date(candidate.data.publishDate).getTime();
      const ageInDays = Math.max(
        0,
        (Date.now() - candidateDate) / (1000 * 60 * 60 * 24)
      );
      const recencyBonus = Math.max(0, 1 - ageInDays / 365);

      return {
        candidate,
        score: sharedTags * 10 + (sameCategory ? 4 : 0) + recencyBonus,
        candidateDate,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || b.candidateDate - a.candidateDate
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate);
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
