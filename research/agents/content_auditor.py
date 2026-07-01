#!/usr/bin/env python3
import os, sys, json, re, math, argparse
from datetime import datetime
from typing import Optional
from pathlib import Path

from dotenv import load_dotenv
import httpx
from bs4 import BeautifulSoup
from readability import Document
import html2text
import textstat
from collections import Counter

from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv()


# ─── Statistical Metrics ────────────────────────────────────────────────────

class TextMetrics:
    SENTENCE_END = re.compile(r'(?<=[.!?])\s+')
    WORD_BOUNDARY = re.compile(r'\b\w+\b')
    AI_PATTERNS = re.compile(
        r'(?i)(it is worth noting|in today.s digital landscape|let.s dive in|'
        r'in the realm of|when it comes to|a wide range of|the fact of the matter|'
        r'it is important to|in order to|as we have seen|as previously mentioned|'
        r'it goes without saying|needless to say|all things considered|'
        r'at the end of the day|the bottom line is|in conclusion|'
        r'to sum it up|ultimately|essentially|basically|'
        r'transformative|revolutionize|game-changer|cutting-edge|'
        r'robust|seamless|leverage|empower|navigate|delve|'
        r'tapestry|testament|arguably|undoubtedly|crucially)'
    )
    CONJUNCTIVE_ADVERBS = re.compile(
        r'(?i)\b(however|therefore|moreover|furthermore|nevertheless|'
        r'consequently|additionally|meanwhile|accordingly|besides)\b'
    )
    EM_DASH = re.compile(r'\u2014|\u2013')  # em dash, en dash

    def __init__(self, text: str):
        self.raw = text
        self.sentences = self.SENTENCE_END.split(text)
        self.words = self.WORD_BOUNDARY.findall(text)
        self._compute()

    def _compute(self):
        n_words = len(self.words) or 1
        n_sents = len(self.sentences) or 1

        # Burstiness: coefficient of variation of sentence lengths
        sent_lens = [len(s.split()) for s in self.sentences if s.strip()]
        mean_sl = sum(sent_lens) / n_sents
        var_sl = sum((l - mean_sl) ** 2 for l in sent_lens) / n_sents if n_sents > 1 else 0
        self.burstiness = (math.sqrt(var_sl) / mean_sl) if mean_sl > 0 else 0

        # Lexical diversity (type-token ratio)
        types = len(set(w.lower() for w in self.words))
        self.lexical_diversity = types / n_words

        # Mean word length
        self.mean_word_length = sum(len(w) for w in self.words) / n_words

        # Mean sentence length
        self.mean_sentence_length = mean_sl

        # AI pattern density
        self.ai_pattern_density = len(self.AI_PATTERNS.findall(self.raw)) / n_words * 1000

        # Conjunctive adverb density (per 1000 words)
        self.conj_adv_density = len(self.CONJUNCTIVE_ADVERBS.findall(self.raw)) / n_words * 1000

        # Em/en dash density
        self.em_dash_count = len(self.EM_DASH.findall(self.raw))
        self.em_dash_density = self.em_dash_count / n_words * 1000

        # Flesch Reading Ease
        self.flesch = textstat.flesch_reading_ease(self.raw)

        # Sentence length variation ratio (short vs long sentences)
        short = sum(1 for s in sent_lens if s <= 8)
        long_ = sum(1 for s in sent_lens if s >= 25)
        self.sentence_variation_ratio = (short + long_) / n_sents if n_sents > 0 else 0

    def summary(self) -> dict:
        return {
            "word_count": len(self.words),
            "sentence_count": len(self.sentences),
            "burstiness": round(self.burstiness, 3),
            "lexical_diversity": round(self.lexical_diversity, 3),
            "mean_word_length": round(self.mean_word_length, 2),
            "mean_sentence_length": round(self.mean_sentence_length, 1),
            "ai_pattern_density": round(self.ai_pattern_density, 2),
            "conjunctive_adverb_density": round(self.conj_adv_density, 2),
            "em_dash_count": self.em_dash_count,
            "em_dash_density": round(self.em_dash_density, 2),
            "flesch_reading_ease": round(self.flesch, 1),
            "sentence_variation_ratio": round(self.sentence_variation_ratio, 3),
        }


# ─── Pydantic Schemas ───────────────────────────────────────────────────────

class FixItem(BaseModel):
    original_text: str = Field(description="The exact problematic passage from the article")
    flaw_type: str = Field(description="Category of flaw: em_dash_overuse | cliche | robotic_transition |"
                         "conjunctive_adverb_spam | hedging | passive_voice | low_burstiness |"
                         "repetitive_structure | ai_vocabulary | promotional_tone")
    humanized_rewrite: str = Field(description="The rewritten version that sounds naturally human")


class AuditReport(BaseModel):
    ai_score_percentage: int = Field(description="Estimated AI footprint of the text, 0-100", ge=0, le=100)
    readability_grade: str = Field(description="Readability level: Very Easy | Easy | Fairly Easy | Standard |"
                                   "Fairly Difficult | Difficult | Very Difficult")
    overall_critique: str = Field(description="High-level assessment of writing quality and robotic patterns detected")
    actionable_fixes: list[FixItem] = Field(description="Specific passages with their humanized rewrites")


class LLMAnalysis(BaseModel):
    """LLM-only output — excludes ai_score_percentage since we compute it statistically."""
    readability_grade: str = Field(description="Readability grade matching AuditReport")
    overall_critique: str = Field(description="High-level assessment of writing quality")
    actionable_fixes: list[FixItem] = Field(description="Specific passages with their humanized rewrites")


# ─── Scraper ────────────────────────────────────────────────────────────────

def fetch_and_extract(url: str, timeout: int = 30) -> str:
    resp = httpx.get(url, follow_redirects=True, timeout=timeout,
                     headers={"User-Agent": "Mozilla/5.0 (compatible; ContentAuditor/1.0)"})
    resp.raise_for_status()

    doc = Document(resp.text)
    html = doc.summary()
    title = doc.short_title()

    h = html2text.HTML2Text()
    h.body_width = 0
    h.ignore_links = False
    h.ignore_images = True
    h.ignore_emphasis = False
    h.skip_internal_links = True
    h.protect_links = True
    markdown = h.handle(html)

    # Prepend title
    content = f"# {title}\n\n{markdown}" if title else markdown

    # Truncate to avoid blowing context window (~12k tokens = ~48k chars)
    max_chars = 45000
    if len(content) > max_chars:
        content = content[:max_chars] + "\n\n[...truncated]"

    return content


# ─── Auditor ────────────────────────────────────────────────────────────────

class ContentAuditor:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        key = api_key or os.environ.get("OPENAI_API_KEY") or os.environ["LLM_API_KEY"]
        base = base_url or os.environ.get("OPENAI_BASE_URL") or os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1")
        self.client = OpenAI(api_key=key, base_url=base)
        self.model = model or os.environ.get("OPENAI_MODEL") or os.environ.get("LLM_MODEL", "gpt-4o-mini")

    KEEP_KEYS = {"ai_score_percentage", "readability_grade", "overall_critique", "actionable_fixes"}

    def _extract_schema(self, data: dict) -> dict:
        """Promote nested fields to top level if a model wraps them."""
        if self.KEEP_KEYS.issubset(data.keys()):
            return data
        for v in data.values():
            if isinstance(v, dict) and self.KEEP_KEYS.issubset(v.keys()):
                return v
            if isinstance(v, dict):
                deeper = self._extract_schema(v)
                if deeper:
                    return deeper
        return data

    def analyze(self, article_text: str, metrics: dict, debug: bool = False) -> AuditReport:
        stat_score = self._compute_statistical_score(metrics)
        stat_grade = self._compute_readability_grade(metrics["flesch_reading_ease"])

        prompt = self._build_prompt(article_text, metrics)

        is_openai = "api.openai.com" in str(self.client.base_url)
        kwargs = dict(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert writing style auditor. Output raw JSON only, no markdown. "
                 "The JSON must have these exact top-level keys (no wrapper object): "
                 '"readability_grade" (one of: Very Easy, Easy, Fairly Easy, Standard, Fairly Difficult, Difficult, Very Difficult), '
                 '"overall_critique" (string), '
                 '"actionable_fixes" (array of objects each with "original_text", "flaw_type", "humanized_rewrite"). '
                 "Do NOT include ai_score_percentage in your JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=4096,
        )

        if is_openai:
            kwargs["response_format"] = LLMAnalysis
            completion = self.client.beta.chat.completions.parse(**kwargs)
            llm = completion.choices[0].message.parsed
            if not llm:
                raise RuntimeError("LLM returned empty parsed response")
            return AuditReport(
                ai_score_percentage=stat_score,
                readability_grade=llm.readability_grade,
                overall_critique=llm.overall_critique,
                actionable_fixes=llm.actionable_fixes,
            )

        kwargs["response_format"] = {"type": "json_object"}
        completion = self.client.chat.completions.create(**kwargs)
        raw = completion.choices[0].message.content
        if not raw:
            raise RuntimeError("LLM returned empty response")
        raw = re.sub(r'^```(?:json)?\s*|\s*```$', '', raw.strip())
        raw = re.sub(r'\\([^"\\/bfnrtu])', r'\1', raw)  # strip invalid escapes like \.
        if debug:
            print(f"  [debug] Raw LLM response:\n{raw[:2000]}")
        data = json.loads(raw)
        data = self._extract_schema(data)
        try:
            llm = LLMAnalysis.model_validate(data)
            return AuditReport(
                ai_score_percentage=stat_score,
                readability_grade=llm.readability_grade,
                overall_critique=llm.overall_critique,
                actionable_fixes=llm.actionable_fixes,
            )
        except Exception:
            if debug:
                import traceback
                traceback.print_exc()
            print("  [!] LLM returned invalid schema, using statistical fallback")
            return AuditReport(
                ai_score_percentage=stat_score,
                readability_grade=stat_grade,
                overall_critique=self._statistical_critique(metrics),
                actionable_fixes=[],
            )

    def _compute_statistical_score(self, metrics: dict) -> int:
        score = 0
        if metrics["burstiness"] < 0.75:
            score += 30
        elif metrics["burstiness"] < 0.9:
            score += 15

        if metrics["lexical_diversity"] < 0.35:
            score += 25
        elif metrics["lexical_diversity"] < 0.45:
            score += 12

        if metrics["ai_pattern_density"] > 5:
            score += 15
        elif metrics["ai_pattern_density"] > 2:
            score += 8

        if metrics["conjunctive_adverb_density"] > 6:
            score += 10
        elif metrics["conjunctive_adverb_density"] > 4:
            score += 5

        if metrics["em_dash_density"] > 1.0:
            score += 10
        elif metrics["em_dash_density"] > 0.5:
            score += 5

        if metrics["sentence_variation_ratio"] < 0.3:
            score += 10
        elif metrics["sentence_variation_ratio"] < 0.4:
            score += 5

        return min(score, 100)

    def _compute_readability_grade(self, flesch: float) -> str:
        if flesch >= 90:
            return "Very Easy"
        elif flesch >= 70:
            return "Easy"
        elif flesch >= 50:
            return "Standard"
        elif flesch >= 30:
            return "Fairly Difficult"
        else:
            return "Difficult"

    def _statistical_critique(self, metrics: dict) -> str:
        issues = []
        if metrics["burstiness"] < 0.75:
            issues.append("low burstiness (monotonous rhythm)")
        if metrics["lexical_diversity"] < 0.45:
            issues.append("low lexical diversity (repetitive vocabulary)")
        if metrics["ai_pattern_density"] > 2:
            issues.append(f"high AI cliche density ({metrics['ai_pattern_density']} per 1K words)")
        if metrics["conjunctive_adverb_density"] > 4:
            issues.append(f"excessive conjunctive adverbs ({metrics['conjunctive_adverb_density']} per 1K words)")
        if metrics["em_dash_density"] > 0.5:
            issues.append(f"em dash overuse ({metrics['em_dash_count']} found)")
        if metrics["sentence_variation_ratio"] < 0.4:
            issues.append("low sentence variation (all similar lengths)")

        if not issues:
            return "No significant statistical issues detected. The text shows healthy variation in sentence length, vocabulary, and punctuation."
        return f"Statistical analysis detected {len(issues)} issues: " + "; ".join(issues) + "."

    def _build_prompt(self, article_text: str, metrics: dict) -> str:
        return f"""Analyze this article for AI-generated writing patterns and produce a precise audit.

## Statistical Profile of the Text
{json.dumps(metrics, indent=2)}

Key thresholds for reference:
- Burstiness < 0.75 → monotonous rhythm (strong AI indicator)
- Lexical diversity < 0.45 → limited vocabulary (AI indicator)
- AI pattern density > 2.0 → excessive AI clichés
- Conjunctive adverb density > 4.0 → robotic transitions
- Em dash density > 0.5 → overuse of dramatic punctuation
- Sentence variation > 0.4 → good mix of short/long sentences
- Flesch < 40 → too difficult; > 70 → approachable

## Article Content
{article_text}

Provide your analysis as a structured audit with specific, line-level fixes."""


# ─── Report Generator ───────────────────────────────────────────────────────

def generate_report(url: str, article_text: str, metrics: dict, report: AuditReport) -> str:
    lines = []
    lines.append(f"# Content Audit Report")
    lines.append(f"")
    lines.append(f"**URL:** {url}")
    lines.append(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"")
    lines.append(f"## Overview")
    lines.append(f"")
    lines.append(f"| Metric | Value |")
    lines.append(f"|--------|-------|")
    lines.append(f"| AI Score | **{report.ai_score_percentage}/100** |")
    lines.append(f"| Readability | {report.readability_grade} (Flesch: {metrics['flesch_reading_ease']}) |")
    lines.append(f"| Word Count | {metrics['word_count']} |")
    lines.append(f"| Sentence Count | {metrics['sentence_count']} |")
    lines.append(f"")
    lines.append(f"## Statistical Breakdown")
    lines.append(f"")
    lines.append(f"| Metric | Value | Target | Status |")
    lines.append(f"|--------|-------|--------|--------|")

    checks = [
        ("Burstiness", metrics["burstiness"], 0.75, ">", "Low variance = robotic rhythm"),
        ("Lexical Diversity", metrics["lexical_diversity"], 0.45, ">", "Low diversity = repetitive vocabulary"),
        ("AI Cliché Density", metrics["ai_pattern_density"], 2.0, "<", "High = flooded with AI catchphrases"),
        ("Conjunctive Adverb Density", metrics["conjunctive_adverb_density"], 4.0, "<", "High = robotic transition spam"),
        ("Em Dash Density", metrics["em_dash_density"], 0.5, "<", "High = dramatic punctuation overuse"),
        ("Sentence Variation Ratio", metrics["sentence_variation_ratio"], 0.4, ">", "Low = all sentences same length"),
    ]
    for name, val, target, op, note in checks:
        passed = (val > target) if op == ">" else (val < target)
        lines.append(f"| {name} | {val} | {'>' if op == '>' else '<'}{target} | {'✅' if passed else '⚠️'} | {note} |")

    lines.append(f"")
    lines.append(f"## Overall Critique")
    lines.append(f"")
    lines.append(f"{report.overall_critique}")
    lines.append(f"")

    if report.actionable_fixes:
        lines.append(f"## Actionable Fixes ({len(report.actionable_fixes)} found)")
        lines.append(f"")
        for i, fix in enumerate(report.actionable_fixes, 1):
            flaw_icon = {
                "em_dash_overuse": "—",
                "cliche": "🗣️",
                "robotic_transition": "🤖",
                "conjunctive_adverb_spam": "🔁",
                "hedging": "🤷",
                "passive_voice": "🫥",
                "low_burstiness": "📏",
                "repetitive_structure": "🔂",
                "ai_vocabulary": "📖",
                "promotional_tone": "📢",
            }.get(fix.flaw_type, "📝")

            lines.append(f"### {i}. {flaw_icon} {fix.flaw_type.replace('_', ' ').title()}")
            lines.append(f"")
            lines.append(f"**Original:**")
            lines.append(f"")
            lines.append(f"> {fix.original_text}")
            lines.append(f"")
            lines.append(f"**Rewrite:**")
            lines.append(f"")
            lines.append(f"> {fix.humanized_rewrite}")
            lines.append(f"")

    lines.append(f"---")
    lines.append(f"*Generated by Content Auditor*")
    return "\n".join(lines)


# ─── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Single-page content auditor")
    parser.add_argument("url", help="URL of the article to audit")
    parser.add_argument("--output", "-o", default="audit_report.md",
                        help="Output markdown file (default: audit_report.md)")
    parser.add_argument("--model", default=None,
                        help="OpenAI model to use (default: gpt-4o-mini)")
    parser.add_argument("--truncate", type=int, default=45000,
                        help="Max characters to send to LLM (default: 45000)")
    parser.add_argument("--debug", action="store_true",
                        help="Print raw LLM response for debugging")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_API_KEY")
    if not api_key:
        print("FATAL: OPENAI_API_KEY or LLM_API_KEY environment variable required")
        sys.exit(1)

    print(f"Fetching: {args.url}")
    try:
        article_text = fetch_and_extract(args.url, timeout=30)
    except Exception as e:
        print(f"FAILED to fetch URL: {e}")
        sys.exit(2)

    print(f"Extracted {len(article_text):,} chars, {len(article_text.split()):,} words")

    # Statistical metrics
    print("Computing statistical metrics...")
    tm = TextMetrics(article_text)
    metrics = tm.summary()

    print(f"  Burstiness: {metrics['burstiness']}  "
          f"LexDiv: {metrics['lexical_diversity']}  "
          f"Flesch: {metrics['flesch_reading_ease']}  "
          f"Em dashes: {metrics['em_dash_count']}")
    if metrics['em_dash_count'] > 0:
        print(f"  [!] Found {metrics['em_dash_count']} em/en dashes — review punctuation overuse")

    # LLM analysis
    model = args.model or os.environ.get("OPENAI_MODEL") or os.environ.get("LLM_MODEL", "gpt-4o-mini")
    print(f"Analyzing with {model}...")
    auditor = ContentAuditor(api_key=api_key, model=model)
    try:
        report = auditor.analyze(article_text, metrics, debug=args.debug)
    except Exception as e:
        print(f"FAILED during LLM analysis: {e}")
        sys.exit(3)

    report_line_count = len(report.actionable_fixes) if report.actionable_fixes else 0
    print(f"  AI Score: {report.ai_score_percentage}/100 (statistical)")
    print(f"  Readability: {report.readability_grade}  |  Fixes: {report_line_count}")

    # Generate markdown report
    md = generate_report(args.url, article_text, metrics, report)
    out_path = Path(args.output)
    out_path.write_text(md, encoding="utf-8")
    print(f"\nReport saved to: {out_path.resolve()}")


if __name__ == "__main__":
    main()
