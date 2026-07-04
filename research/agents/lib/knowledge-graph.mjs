import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const VAULT_DIR = path.join(ROOT_DIR, "research/vault");
const GRAPH_JSON_VAULT = path.join(VAULT_DIR, "graph.json");
const GRAPH_JSON_AGENTS = path.join(ROOT_DIR, "research/agents/graph.json");

// Helper to normalize note name to node ID
export function normalizeId(name) {
  return name.toLowerCase().replace(/\.md$/, "").replace(/\\/g, "/").trim();
}

// Simple YAML frontmatter parser
function parseFrontmatter(content) {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(fmRegex);
  if (!match) return { frontmatter: {}, body: content };

  const fmText = match[1];
  const body = content.slice(match[0].length);
  const frontmatter = {};

  const lines = fmText.split("\n");
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Array item format: - "item" or - item
    if (trimmed.startsWith("-") && currentArray) {
      const val = trimmed.slice(1).trim().replace(/^["']|["']$/g, "");
      currentArray.push(val);
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let valText = line.slice(colonIdx + 1).trim();

    // Check if it starts an array block
    if (valText === "" || valText === "[]") {
      currentKey = key;
      currentArray = [];
      frontmatter[key] = currentArray;
    } else if (valText.startsWith("[")) {
      // Inline array like ["a", "b"]
      const cleanText = valText.slice(1, -1);
      frontmatter[key] = cleanText.split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      currentKey = null;
      currentArray = null;
    } else {
      // String or primitive value
      const cleanVal = valText.replace(/^["']|["']$/g, "");
      frontmatter[key] = cleanVal;
      currentKey = null;
      currentArray = null;
    }
  }

  return { frontmatter, body };
}

// Extract Obsidian links like [[some-note]] or [[some-note|alias]]
function extractWikiLinks(text) {
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    links.push(match[1].trim());
  }
  return [...new Set(links)];
}

// Crawl directories recursively
function getMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === "node_modules" || file === ".git" || file === ".obsidian") continue;
    const fpath = path.join(dir, file);
    const stat = fs.statSync(fpath);
    if (stat && stat.isDirectory()) {
      results.push(...getMarkdownFiles(fpath));
    } else if (file.endsWith(".md")) {
      results.push(fpath);
    }
  }
  return results;
}

// Parse vault and build Knowledge Graph
export function buildKnowledgeGraph() {
  console.log(`[Knowledge Graph] Scanning vault directory: ${VAULT_DIR}`);
  const files = getMarkdownFiles(VAULT_DIR);
  console.log(`[Knowledge Graph] Found ${files.length} markdown notes.`);

  const nodes = [];
  const edges = [];
  const nodeMap = new Map();

  // 1. Create nodes
  for (const fpath of files) {
    const relativePath = path.relative(VAULT_DIR, fpath).replace(/\\/g, "/");
    const filename = path.basename(fpath, ".md");
    const id = normalizeId(filename);

    let content = "";
    try {
      content = fs.readFileSync(fpath, "utf-8");
    } catch (err) {
      console.error(`Error reading ${fpath}: ${err.message}`);
      continue;
    }

    const { frontmatter, body } = parseFrontmatter(content);
    const title = frontmatter.title || filename;
    const type = frontmatter.type || "note";

    const node = {
      id,
      title,
      type,
      path: relativePath,
      metadata: frontmatter,
      bodyExcerpt: body.slice(0, 1000) // Keep first 1000 characters for context retrieval
    };

    nodes.push(node);
    nodeMap.set(id, node);
  }

  // 2. Resolve wiki links and create edges
  for (const node of nodes) {
    const fpath = path.join(VAULT_DIR, node.path);
    const content = fs.readFileSync(fpath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);

    // Extract wiki links from body
    const bodyLinks = extractWikiLinks(body);
    for (const link of bodyLinks) {
      const targetId = normalizeId(link);
      edges.push({
        source: node.id,
        target: targetId,
        type: "link"
      });
    }

    // Process frontmatter prerequisites
    const prereqs = Array.isArray(frontmatter.prerequisites) ? frontmatter.prerequisites : [];
    for (const prereq of prereqs) {
      // Prerequisites could be wiki links e.g. "[[automated-dns-fix]]" or plain strings
      const cleanPrereq = prereq.replace(/^\[\[|\]\]$/g, "");
      const targetId = normalizeId(cleanPrereq);
      edges.push({
        source: node.id,
        target: targetId,
        type: "prerequisite"
      });
    }

    // Process uses_tech linkage
    const techs = Array.isArray(frontmatter.uses_tech) ? frontmatter.uses_tech : [];
    for (const tech of techs) {
      const techId = normalizeId(tech);
      // Create virtual entity node for the tech if not present in map
      if (!nodeMap.has(techId)) {
        const techNode = {
          id: techId,
          title: tech,
          type: "tech",
          path: "",
          metadata: {},
          bodyExcerpt: `Technology node for ${tech}.`
        };
        nodes.push(techNode);
        nodeMap.set(techId, techNode);
      }
      edges.push({
        source: node.id,
        target: techId,
        type: "uses_tech"
      });
    }

    // Process resolves_issue link
    if (frontmatter.resolves_issue) {
      const issue = frontmatter.resolves_issue;
      // If it contains wiki link format
      const cleanIssue = issue.replace(/^\[\[|\]\]$/g, "");
      const targetId = normalizeId(cleanIssue);
      edges.push({
        source: node.id,
        target: targetId,
        type: "resolves_issue"
      });
    }
  }

  // 3. Clean duplicate edges and self-references
  const cleanEdges = [];
  const edgeSet = new Set();

  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    const key = `${edge.source}->${edge.target}:${edge.type}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      cleanEdges.push(edge);
    }
  }

  const graphData = {
    generatedAt: new Date().toISOString(),
    nodes,
    edges: cleanEdges
  };

  try {
    fs.writeFileSync(GRAPH_JSON_AGENTS, JSON.stringify(graphData, null, 2), "utf-8");
    // Write backup to Vault directory
    fs.writeFileSync(GRAPH_JSON_VAULT, JSON.stringify(graphData, null, 2), "utf-8");
    console.log(`[Knowledge Graph] Successfully wrote graph.json with ${nodes.length} nodes and ${cleanEdges.length} edges.`);
  } catch (err) {
    console.error(`Failed to write graph.json: ${err.message}`);
  }

  return graphData;
}

// Retrieve connected context from graph.json for a query/topic
export function getGraphContext(topicTitle) {
  let graph = null;
  if (fs.existsSync(GRAPH_JSON_AGENTS)) {
    try {
      graph = JSON.parse(fs.readFileSync(GRAPH_JSON_AGENTS, "utf-8"));
    } catch {}
  }

  if (!graph) {
    // Attempt building if not loaded
    try {
      graph = buildKnowledgeGraph();
    } catch {
      return "";
    }
  }

  const targetId = normalizeId(topicTitle);
  // Find node by ID or title
  const mainNode = graph.nodes.find(n => n.id === targetId || n.title.toLowerCase() === topicTitle.toLowerCase());
  if (!mainNode) {
    // Fallback: search for subtitle/description substring matches
    const partialMatch = graph.nodes.find(n => n.title.toLowerCase().includes(topicTitle.toLowerCase()));
    if (!partialMatch) return "";
    return formatContextForNode(partialMatch, graph);
  }

  return formatContextForNode(mainNode, graph);
}

function formatContextForNode(node, graph) {
  const incoming = graph.edges.filter(e => e.target === node.id);
  const outgoing = graph.edges.filter(e => e.source === node.id);

  let output = `\n\n## Knowledge Graph Relationships (From: ${node.title})\n`;
  output += `* **Node ID:** \`${node.id}\` | **Type:** \`${node.type}\`\n`;

  // 1. Prerequisites required for this node
  const prereqs = outgoing.filter(e => e.type === "prerequisite").map(e => graph.nodes.find(n => n.id === e.target)).filter(Boolean);
  if (prereqs.length > 0) {
    output += `### 🛠️ Prerequisites\n`;
    for (const p of prereqs) {
      output += `- **[${p.title}](file:///${VAULT_DIR.replace(/\\/g, "/")}/${p.path})**: ${p.metadata.resolves_issue || "Prerequisite setup"}\n`;
    }
  }

  // 2. Solved Issues / Diffs
  const resolves = outgoing.filter(e => e.type === "resolves_issue").map(e => graph.nodes.find(n => n.id === e.target)).filter(Boolean);
  if (resolves.length > 0) {
    output += `### 🐞 Resolves Issues\n`;
    for (const r of resolves) {
      output += `- **[${r.title}](file:///${VAULT_DIR.replace(/\\/g, "/")}/${r.path})**: ${r.metadata.description || "Issue resolution record"}\n`;
    }
  }

  // 3. Technologies used
  const techs = outgoing.filter(e => e.type === "uses_tech").map(e => graph.nodes.find(n => n.id === e.target)).filter(Boolean);
  if (techs.length > 0) {
    output += `### 💻 Technologies Utilized\n`;
    output += `- **Tech List:** ${techs.map(t => `\`${t.title}\``).join(", ")}\n`;
  }

  // 4. Outgoing normal linkages
  const linked = outgoing.filter(e => e.type === "link").map(e => graph.nodes.find(n => n.id === e.target)).filter(Boolean);
  if (linked.length > 0) {
    output += `### 🔗 Related Obsidian Connections\n`;
    for (const l of linked.slice(0, 5)) {
      if (l.path) {
        output += `- [${l.title}](file:///${VAULT_DIR.replace(/\\/g, "/")}/${l.path})\n`;
      } else {
        output += `- \`${l.title}\` (Virtual note)\n`;
      }
    }
  }

  // 5. Incoming references (what links here)
  const backreferences = incoming.map(e => graph.nodes.find(n => n.id === e.source)).filter(Boolean);
  if (backreferences.length > 0) {
    output += `### ↩️ Referenced By\n`;
    for (const b of backreferences.slice(0, 5)) {
      output += `- [${b.title}](file:///${VAULT_DIR.replace(/\\/g, "/")}/${b.path})\n`;
    }
  }

  return output;
}

// Support CLI execution
if (process.argv[1] && (process.argv[1].endsWith("knowledge-graph.mjs") || process.argv[1].endsWith("knowledge-graph"))) {
  if (process.argv.includes("--query") || process.argv.includes("-q")) {
    const qIdx = process.argv.findIndex(a => a === "--query" || a === "-q");
    const query = process.argv[qIdx + 1];
    if (!query) {
      console.error("Missing query parameter.");
      process.exit(1);
    }
    console.log(getGraphContext(query));
  } else {
    buildKnowledgeGraph();
  }
}
