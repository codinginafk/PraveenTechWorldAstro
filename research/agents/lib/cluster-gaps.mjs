// Cluster gap analysis — identifies missing articles in a topic cluster
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");

// For each pillar, the ideal article types we want
const CLUSTER_TEMPLATES = {
  "website-setup": [
    { type: "setup-guide", pattern: /setup|set up|install|add|connect/i },
    { type: "verification-error", pattern: /verification|verify|confirm|validate/i },
    { type: "not-working", pattern: /not working|not showing|not tracking|error|failed/i },
    { type: "step-by-step", pattern: /how to|step by step|guide|tutorial/i },
    { type: "comparison", pattern: /vs|alternative|comparison|difference/i },
    { type: "troubleshooting", pattern: /fix|solve|repair|resolve|troubleshoot/i },
    { type: "best-practices", pattern: /best|tips|guide|checklist|optimize/i },
  ],
  "windows-fixes": [
    { type: "error-fix", pattern: /error|0x|c000|bsod|blue screen/i },
    { type: "performance", pattern: /slow|high cpu|high ram|high disk|performance/i },
    { type: "recovery", pattern: /recovery|safe mode|startup repair|system restore|reset/i },
    { type: "reinstall", pattern: /reinstall|clean install|reinstallation|fresh install/i },
    { type: "networking", pattern: /wifi|dns|ethernet|network|internet|ip/i },
    { type: "driver", pattern: /driver|gpu|graphics|nvidia|amd|intel/i },
    { type: "update", pattern: /update|kb\d|patch|upgrade|version/i },
  ],
  "hosting-infra": [
    { type: "setup", pattern: /setup|set up|configure|install/i },
    { type: "domain-dns", pattern: /domain|dns|nameserver|connect domain/i },
    { type: "ssl", pattern: /ssl|https|certificate|secure/i },
    { type: "cloudflare", pattern: /cloudflare|cdn|dns.*cloudflare/i },
    { type: "comparison", pattern: /vs|comparison|alternative|best/i },
  ],
  "ai-websites": [
    { type: "ai-content", pattern: /ai.*content|ai.*write|ai.*blog/i },
    { type: "ai-seo", pattern: /ai.*seo|ai.*keyword|ai.*rank/i },
    { type: "ai-workflow", pattern: /ai.*workflow|ai.*automate|ai.*productivity/i },
    { type: "ai-tools", pattern: /ai.*tool|ai.*app|best.*ai/i },
  ],
  "ai-automation": [
    { type: "script", pattern: /python|script|automation|cli|tool/i },
    { type: "prompt", pattern: /prompt|deepseek|opencode|llm/i },
    { type: "pipeline", pattern: /pipeline|etl|data.*flow|workflow/i },
    { type: "api", pattern: /api|integration|webhook|endpoint/i },
  ],
  "it-operations": [
    { type: "database", pattern: /database|sql|query|audit|erp/i },
    { type: "sysadmin", pattern: /server|backup|network|infrastructure|admin/i },
    { type: "security", pattern: /security|audit|compliance|access/i },
    { type: "migration", pattern: /migration|upgrade|transition|deploy/i },
  ],
  "build-in-public": [
    { type: "experiment", pattern: /experiment|trial|attempt|battle.log/i },
    { type: "failure", pattern: /fail|broke|wrong|error|hallucinat/i },
    { type: "lesson", pattern: /lesson|learned|discovered|realized/i },
    { type: "process", pattern: /process|workflow|approach|method/i },
  ],
};

export function identifyGapsInCluster(clusterId, researchClusters) {
  const templates = CLUSTER_TEMPLATES[clusterId];
  if (!templates) return [];

  // Read existing articles in this cluster
  const existingArticles = [];
  if (fs.existsSync(ARTICLES_DIR)) {
    for (const f of fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"))) {
      try {
        const content = fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8");
        if (content.includes(`pillarId: ${clusterId}`) || content.includes(`category: ${clusterId}`)) {
          const titleMatch = content.match(/title:\s*"(.+?)"/);
          if (titleMatch) existingArticles.push(titleMatch[1].toLowerCase());
        }
      } catch {}
    }
  }

  // Also check research topics for gaps
  const researchTitles = [];
  for (const rc of researchClusters) {
    for (const a of rc.articles || []) {
      if (a.title) researchTitles.push(a.title.toLowerCase());
    }
  }

  const gaps = [];
  for (const template of templates) {
    const hasExisting = existingArticles.some(t => template.pattern.test(t));
    const hasResearch = researchTitles.some(t => template.pattern.test(t));

    if (!hasExisting && !hasResearch) {
      gaps.push({
        type: template.type,
        title: `Missing: ${template.type.replace(/-/g, " ")} article in ${clusterId}`,
        pattern: template.pattern,
        priority: hasResearch ? "medium" : "high",
      });
    } else if (!hasExisting && hasResearch) {
      gaps.push({
        type: template.type,
        title: `Researched but not written: ${template.type.replace(/-/g, " ")}`,
        pattern: template.pattern,
        priority: "medium",
      });
    }
  }

  return gaps;
}
