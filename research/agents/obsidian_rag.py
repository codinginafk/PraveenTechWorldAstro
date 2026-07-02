#!/usr/bin/env python3
"""
Knowledge RAG Pipeline — Information Gain Engine
Searches across multiple knowledge directories for relevant context:
  research/vault/          — Obsidian vault notes
  research/experiments/    — Experiment logs & results
  research/terminal-logs/  — Command history & terminal output
  research/benchmarks/     — Benchmark data & comparisons
  research/bookmarks/      — Saved resource links
  research/github-notes/   — GitHub issue / PR notes
  research/project-logs/   — Project postmortems & decision records

Usage:
  python obsidian_rag.py <query>
  python obsidian_rag.py --sync   # sync vault notes first
  python obsidian_rag.py --index  # index all knowledge dirs for retrieval
"""

import os, sys, re, json, math, glob
from pathlib import Path
from typing import Optional
from collections import defaultdict
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent

KNOWLEDGE_DIRS = {
    "vault": PROJECT_ROOT / "research" / "vault",
    "experiments": PROJECT_ROOT / "research" / "experiments",
    "terminal-logs": PROJECT_ROOT / "research" / "terminal-logs",
    "benchmarks": PROJECT_ROOT / "research" / "benchmarks",
    "bookmarks": PROJECT_ROOT / "research" / "bookmarks",
    "github-notes": PROJECT_ROOT / "research" / "github-notes",
    "project-logs": PROJECT_ROOT / "research" / "project-logs",
}

ARTICLES_DIR = PROJECT_ROOT / "src" / "content" / "articles"
PUBLISHED_DIR = (PROJECT_ROOT / "research" / "vault" / "Published") if (PROJECT_ROOT / "research" / "vault" / "Published").exists() else None

class KnowledgeRAG:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        key = api_key or os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_API_KEY")
        base = os.environ.get("OPENAI_BASE_URL") or os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1")
        self.client = OpenAI(api_key=key, base_url=base)
        self.model = model or os.environ.get("LLM_MODEL", "gpt-4o-mini")

    def search_knowledge(self, query: str, top_k: int = 5) -> list[dict]:
        """Search all knowledge directories for relevant context. Returns list of {source, content, score}."""
        results = []
        query_lower = query.lower()
        query_terms = set(re.findall(r'\b\w{3,}\b', query_lower))

        for source_name, source_dir in KNOWLEDGE_DIRS.items():
            if not source_dir.exists():
                continue
            for fpath in sorted(source_dir.rglob("*")):
                if not fpath.is_file():
                    continue
                if fpath.suffix not in (".md", ".txt", ".log", ".json", ".csv", ".py", ".sh", ".ps1", ".yaml", ".yml"):
                    continue
                try:
                    text = fpath.read_text(encoding="utf-8", errors="replace")
                except Exception:
                    continue

                # Simple TF-like relevance scoring
                text_lower = text.lower()
                term_hits = sum(1 for t in query_terms if t in text_lower)
                if term_hits == 0:
                    continue

                # Boost title matches
                title_boost = 2.0 if any(t in fpath.stem.lower() for t in query_terms) else 1.0
                score = (term_hits / max(len(query_terms), 1)) * title_boost

                # Extract meaningful snippet (first 500 chars or around first match)
                snippet = text[:500].strip()
                for t in query_terms:
                    idx = text_lower.find(t)
                    if idx != -1:
                        start = max(0, idx - 100)
                        end = min(len(text), idx + 400)
                        snippet = text[start:end].strip()
                        break

                results.append({
                    "source": f"{source_name}/{fpath.relative_to(source_dir)}",
                    "content": snippet[:800],
                    "score": round(score, 3),
                    "path": str(fpath),
                })

        results.sort(key=lambda r: r["score"], reverse=True)
        return results[:top_k]

    def search_articles(self, query: str, top_k: int = 3) -> list[dict]:
        """Search published articles for relevant context."""
        results = []
        query_lower = query.lower()
        query_terms = set(re.findall(r'\b\w{3,}\b', query_lower))

        for fpath in sorted(ARTICLES_DIR.glob("*.mdx")):
            try:
                text = fpath.read_text(encoding="utf-8")
            except Exception:
                continue

            text_lower = text.lower()
            term_hits = sum(1 for t in query_terms if t in text_lower)
            if term_hits == 0:
                continue

            title_match = re.search(r'title:\s*"?(.+?)"?\n', text)
            title = title_match.group(1) if title_match else fpath.stem
            score = term_hits / max(len(query_terms), 1)

            results.append({
                "source": f"articles/{fpath.name}",
                "title": title,
                "score": round(score, 3),
                "content": fpath.stem,
            })

        results.sort(key=lambda r: r["score"], reverse=True)
        return results[:top_k]

    def generate_context_for_query(self, query: str) -> str:
        """Search all knowledge sources and format as a markdown context block."""
        knowledge = self.search_knowledge(query, top_k=5)
        articles = self.search_articles(query, top_k=3)

        parts = []
        if knowledge:
            parts.append("## Relevant Knowledge Sources\n")
            for k in knowledge:
                parts.append(f"### {k['source']} (score: {k['score']})\n")
                parts.append(f"{k['content']}\n")

        if articles:
            parts.append("## Related Published Articles\n")
            for a in articles:
                parts.append(f"- [{a['title']}](/blog/{a['content']})\n")

        return "\n".join(parts) if parts else ""

    def analyze_rich_quality(self, body: str) -> dict:
        """Score an article on: original examples, real commands, screenshots, code, benchmarks, statistics, mistakes, tradeoffs."""
        if not body.strip():
            return {"quality_score": 0, "details": {}}

        prompt = f"""Analyze this article and count occurrences of:

1. **original_examples** — personal experiences, specific incidents the author encountered
2. **real_commands** — exact CLI commands, code snippets, config blocks
3. **benchmarks** — performance numbers, timing data, comparison results
4. **statistics** — specific numbers, percentages, counts from real data
5. **mistakes** — things that went wrong, errors encountered, failures
6. **tradeoffs** — comparisons between approaches, pros/cons discussed
7. **screenshots_diagrams** — references to images, diagrams, or figures

Output JSON:
{{
  "original_examples": count,
  "real_commands": count,
  "benchmarks": count,
  "statistics": count,
  "mistakes": count,
  "tradeoffs": count,
  "screenshots_diagrams": count,
  "total": sum,
  "quality_verdict": "low | medium | high"
}}

Article:
{body[:6000]}
"""
        try:
            r = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Count evidence types. Output raw JSON only."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=1024,
            )
            data = json.loads(r.choices[0].message.content)
            total = sum(data.get(k, 0) for k in ("original_examples", "real_commands", "benchmarks", "statistics", "mistakes", "tradeoffs", "screenshots_diagrams"))
            data["total"] = total
            if total >= 7:
                data["quality_verdict"] = "high"
            elif total >= 3:
                data["quality_verdict"] = "medium"
            else:
                data["quality_verdict"] = "low"
            return {"quality_score": total, "details": data}
        except Exception as e:
            return {"quality_score": 0, "details": {"error": str(e)}}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    do_sync = "--sync" in sys.argv
    do_index = "--index" in sys.argv
    do_quality = "--quality" in sys.argv

    rag = KnowledgeRAG()

    if do_sync:
        try:
            from obsidian_sync import syncObsidianVault
            print("[RAG] Syncing vault from articles...")
            syncObsidianVault()
        except ImportError:
            print("[RAG] obsidian_sync not available, skipping vault sync")

    if do_index:
        print("[RAG] Indexing knowledge directories...")
        for name, d in KNOWLEDGE_DIRS.items():
            count = len([f for f in d.rglob("*") if f.is_file()]) if d.exists() else 0
            print(f"  {name}: {count} files" if d.exists() else f"  {name}: NOT FOUND")
        print("[RAG] Index complete.")

    if do_quality:
        print("[RAG] Computing Rich Quality Scores for all articles...")
        for fpath in sorted(ARTICLES_DIR.glob("*.mdx")):
            text = fpath.read_text(encoding="utf-8")
            body = re.sub(r'^---.*?---\s*', '', text, count=1, flags=re.DOTALL)
            result = rag.analyze_rich_quality(body)
            q = result["quality_score"]
            v = result["details"].get("quality_verdict", "?")
            print(f"  [{fpath.stem[:40]:40s}] Q={q:2d} {v}")

    if args:
        query = " ".join(args)
        print(f"[RAG] Searching knowledge for: {query}")
        context = rag.generate_context_for_query(query)
        if context:
            print(context)
        else:
            print("[RAG] No relevant knowledge found for this query.")

    if not any([do_sync, do_index, do_quality, args]):
        print(__doc__)


if __name__ == "__main__":
    main()
