import { getCollection } from "astro:content";
import { calculateReadingTime } from "@lib/utils/readingTime";

export async function GET() {
  const articles = await getCollection("articles");
  const published = articles
    .filter((a) => !a.data.draft)
    .sort(
      (a, b) =>
        new Date(b.data.publishDate).getTime() -
        new Date(a.data.publishDate).getTime()
    );

  const items = published.map(
    (article) => `
    <item>
      <title><![CDATA[${article.data.seoTitle || article.data.title}]]></title>
      <description><![CDATA[${article.data.description}]]></description>
      <link>https://praveentechworld.com/blog/${article.id}</link>
      <guid>https://praveentechworld.com/blog/${article.id}</guid>
      <pubDate>${new Date(article.data.publishDate).toUTCString()}</pubDate>
      <category>${article.data.category}</category>
    </item>`
  );

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>PraveenTechWorld</title>
        <description>Practical Technology Knowledge Base</description>
        <link>https://praveentechworld.com</link>
        <atom:link href="https://praveentechworld.com/rss.xml" rel="self" type="application/rss+xml"/>
        <language>en</language>
        ${items.join("")}
      </channel>
    </rss>`,
    {
      headers: { "Content-Type": "application/xml" },
    }
  );
}
