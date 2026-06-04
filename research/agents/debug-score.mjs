import { llmScoreTopic } from "./lib/seo-scorer.mjs";
const topic = { title: 'Chrome removes AI privacy wording, Google says data still stays on-device', source: 'Google News', snippet: 'Chrome removes AI privacy wording' };
const result = await llmScoreTopic(topic, []);
console.log("pillarFit:", result.pillarFit, "overallScore:", result.overallScore);
console.log("seoTitle:", result.seoTitle);
console.log("recommendedTags:", result.recommendedTags);
