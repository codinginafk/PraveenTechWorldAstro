import { getCollection } from "astro:content";

export async function GET() {
  const articles = await getCollection("articles");
  const published = articles
    .filter((a) => !a.data.draft)
    .sort(
      (a, b) =>
        new Date(b.data.publishDate).getTime() -
        new Date(a.data.publishDate).getTime()
    );

  const lastBuild = published.length > 0
    ? new Date(published[0].data.publishDate).toUTCString()
    : new Date().toUTCString();

  const items = published.map(
    (article) => `
    <item>
      <title><![CDATA[${article.data.seoTitle || article.data.title}]]></title>
      <description><![CDATA[${article.data.description}]]></description>
      <link>https://www.praveentechworld.com/blog/${article.id}</link>
      <guid>https://www.praveentechworld.com/blog/${article.id}</guid>
      <pubDate>${new Date(article.data.publishDate).toUTCString()}</pubDate>
      <category>${article.data.category}</category>
      <dc:creator><![CDATA[Praveen]]></dc:creator>
      ${article.data.coverImage ? `<media:content url="${article.data.coverImage}" medium="image" />` : ""}
    </item>`
  );

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0"
      xmlns:atom="http://www.w3.org/2005/Atom"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:media="http://search.yahoo.com/mrss/">
      <channel>
        <title>PraveenTechWorld</title>
        <description>Practical Technology Knowledge Base</description>
        <link>https://www.praveentechworld.com</link>
        <atom:link href="https://www.praveentechworld.com/rss.xml" rel="self" type="application/rss+xml"/>
        <language>en</language>
        <lastBuildDate>${lastBuild}</lastBuildDate>
        ${items.join("")}
      </channel>
    </rss>`,
    {
      headers: { "Content-Type": "application/xml" },
    }
  );
}
