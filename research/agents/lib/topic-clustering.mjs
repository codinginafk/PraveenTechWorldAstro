import { token_set_ratio } from "fuzzball";

const SIMILARITY_THRESHOLD = 65;

export function clusterHeadlines(articles) {
  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < articles.length; i++) {
    if (assigned.has(i)) continue;
    const cluster = {
      clusterKey: articles[i].title,
      articles: [articles[i]],
      sources: new Set([articles[i].source]),
      topHeadlines: [articles[i].title],
    };

    for (let j = i + 1; j < articles.length; j++) {
      if (assigned.has(j)) continue;
      const score = token_set_ratio(articles[i].title, articles[j].title);
      if (score >= SIMILARITY_THRESHOLD) {
        cluster.articles.push(articles[j]);
        cluster.sources.add(articles[j].source);
        cluster.topHeadlines.push(articles[j].title);
        assigned.add(j);
      }
    }

    assigned.add(i);
    cluster.clusterSize = cluster.articles.length;
    cluster.sourceDiversity = cluster.sources.size;
    clusters.push(cluster);
  }

  clusters.sort((a, b) => b.clusterSize - a.clusterSize);
  return clusters;
}
