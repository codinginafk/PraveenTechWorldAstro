// LinkedIn Quality Gates (LQ1-LQ9)
// Each gate checks a specific aspect of the post against LinkedIn 2026 best practices

const GATES = {
  LQ1: {
    id: "LQ1",
    name: "Hook grabs in first 2 lines",
    desc: "First 2 lines must stop scrolling — question, bold statement, or painful problem",
    check: (text) => {
      const lines = text.split("\n").filter(l => l.trim().length > 0);
      const firstTwo = lines.slice(0, 2).join(" ").toLowerCase();
      const patterns = [
        /\?/, /can't/i, /won't/i, /doesn't/i, /isn't/i, /aren't/i, /haven't/i,
        /stop/i, /frustrat/i, /struggl/i, /annoying/i, /waste/i, /nobody/i,
        /everyone/i, /the truth/i, /here's what/i, /this is why/i, /i've/i, /i was/i,
        /\d+%/, /\d+x/, /\d+ (ways|tips|fixes|steps|reasons|mistakes|lessons)/i,
        /here is what/i, /most people/i, /never/i, /always/i, /every time/i,
      ];
      const line1 = lines[0]?.toLowerCase() || "";
      const line1Strong = /^(you|i've|i was|here's|the|most|why|how|what|stop|never|always)/.test(line1);
      const hitCount = patterns.filter(p => p.test(firstTwo)).length;
      return { pass: hitCount >= 2 || line1Strong, score: Math.min(hitCount + (line1Strong ? 1 : 0), 5), details: hitCount >= 2 ? "Strong hook" : (line1Strong ? "Hook present but could be stronger" : `Only ${hitCount} hook signals found`) };
    }
  },
  LQ2: {
    id: "LQ2",
    name: "No engagement bait",
    desc: "LinkedIn 2026 algorithm penalizes 'Comment YES', 'Like if', 'Tag someone'",
    check: (text) => {
      const bait = [
        /comment\s+(yes|no|below|down)/i, /like\s+if/i, /tag\s+(someone|a friend|3)/i,
        /share\s+if/i, /double\s+tap/i, /save\s+this\s+post/i, /follow\s+for/i,
        /turn\s+on\s+notifications/i, /ring\s+the\s+bell/i,
      ];
      const hits = bait.filter(b => b.test(text));
      return { pass: hits.length === 0, score: hits.length === 0 ? 5 : 0, details: hits.length === 0 ? "No engagement bait detected" : `Bait phrases found: ${hits.join(", ")}` };
    }
  },
  LQ3: {
    id: "LQ3",
    name: "Personal voice",
    desc: "Uses 'I', 'me', 'my' — authentic personal tone performs better",
    check: (text) => {
      const hasI = /\bI['\u2019]?[a-z]*\b/i.test(text);
      const iCount = (text.match(/\bI['\u2019]?[a-z]*\b/gi) || []).length;
      const hasPersonal = /my\s+|i'v|i w|i tr|i us|i bui|i cre|i fou|i le|i not|i thi/i.test(text);
      return { pass: hasI && iCount >= 2, score: Math.min(iCount, 5), details: hasI && iCount >= 2 ? `${iCount} personal references — good` : (hasI ? `Only ${iCount} personal reference` : "No personal voice detected") };
    }
  },
  LQ4: {
    id: "LQ4",
    name: "Saves-worthy value",
    desc: "Actionable content that users bookmark — Saves = 5x more reach than likes",
    check: (text) => {
      const patterns = [
        /here ('s|is) (what|how|the)/i, /\d+ (steps?|ways?|tips?|methods?|fixes?|signs?|lessons?|things?)/i,
        /checklist/i, /template/i, /framework/i, /guide/i, /tutorial/i,
        /step[-\s]by[-\s]step/i, /pro[-\s]tip/i, /how to/i, /follow these/i,
        /do this/i, /try this/i, /here's a/i,
      ];
      const hits = patterns.filter(p => p.test(text));
      return { pass: hits.length >= 1, score: Math.min(hits.length, 5), details: hits.length >= 1 ? `${hits.length} value signals found` : "No actionable value signals detected" };
    }
  },
  LQ5: {
    id: "LQ5",
    name: "Formatting for readability",
    desc: "Short paragraphs, line breaks, emoji use for visual breaks",
    check: (text) => {
      const paragraphs = text.split("\n\n").filter(p => p.trim().length > 0);
      const longParas = paragraphs.filter(p => p.split(/\s+/).length > 60);
      const hasEmoji = /\p{Emoji}/u.test(text);
      const hasLineBreaks = text.includes("\n\n");
      const issues = [];
      if (longParas.length > 0) issues.push(`${longParas.length} long paragraph(s)`);
      if (!hasEmoji) issues.push("No emoji used");
      if (!hasLineBreaks) issues.push("No paragraph breaks");
      const score = (hasEmoji ? 2 : 0) + (hasLineBreaks ? 2 : 0) + (longParas.length === 0 ? 1 : 0);
      return { pass: score >= 3, score, details: issues.length === 0 ? "Good formatting" : `Issues: ${issues.join(", ")}` };
    }
  },
  LQ6: {
    id: "LQ6",
    name: "Link not in post body",
    desc: "Links in post body reduce reach — place in first comment instead",
    check: (text) => {
      const hasUrl = /https?:\/\/[^\s]+/.test(text);
      return { pass: !hasUrl, score: hasUrl ? 0 : 5, details: hasUrl ? "URL found in post body — move to first comment" : "No URL in post body" };
    }
  },
  LQ7: {
    id: "LQ7",
    name: "Image attached",
    desc: "Image posts get 2x more comments than text-only posts",
    check: (_text, options) => {
      const hasImage = options?.hasImage || false;
      return { pass: hasImage, score: hasImage ? 5 : 0, details: hasImage ? "Image attached" : "No image — LinkedIn favors posts with images" };
    }
  },
  LQ8: {
    id: "LQ8",
    name: "Character count in range",
    desc: "LinkedIn sweet spot: 300-3000 chars. 1500-2000 is optimal for engagement",
    check: (text) => {
      const len = text.length;
      if (len < 300) return { pass: false, score: 0, details: `Too short: ${len} chars (min 300)` };
      if (len > 3000) return { pass: false, score: 0, details: `Too long: ${len} chars (max 3000)` };
      if (len >= 1500 && len <= 2000) return { pass: true, score: 5, details: `Optimal length: ${len} chars` };
      if (len >= 800) return { pass: true, score: 3, details: `Good length: ${len} chars` };
      return { pass: true, score: 2, details: `Adequate length: ${len} chars` };
    }
  },
  LQ9: {
    id: "LQ9",
    name: "Hashtag count",
    desc: "LinkedIn recommends 3-5 hashtags maximum",
    check: (text) => {
      const tags = text.match(/#\w+/g) || [];
      const count = tags.length;
      if (count === 0) return { pass: false, score: 0, details: "No hashtags — add 3-5 for discoverability" };
      if (count > 5) return { pass: false, score: 0, details: `${count} hashtags — max 5 recommended` };
      if (count >= 3 && count <= 5) return { pass: true, score: 5, details: `${count} hashtags — ideal range` };
      return { pass: true, score: 3, details: `${count} hashtags — try to use 3-5` };
    }
  },
};

export function verifyLinkedInPost(postText, options = {}) {
  const results = [];
  let totalScore = 0;
  let gatesPassed = 0;

  for (const [id, gate] of Object.entries(GATES)) {
    try {
      const result = gate.check(postText, options);
      results.push({
        id: gate.id,
        name: gate.name,
        desc: gate.desc,
        pass: result.pass,
        score: result.score,
        details: result.details,
      });
      if (result.pass) gatesPassed++;
      totalScore += typeof result.score === "number" ? result.score : 0;
    } catch (err) {
      results.push({
        id: gate.id,
        name: gate.name,
        desc: gate.desc,
        pass: false,
        score: 0,
        details: `Error: ${err.message}`,
      });
    }
  }

  const maxScore = Object.keys(GATES).length * 5;
  const normalizedScore = Math.round((totalScore / maxScore) * 100);
  const allPassed = gatesPassed === Object.keys(GATES).length;

  return {
    passed: allPassed,
    score: normalizedScore,
    gatesPassed,
    gatesTotal: Object.keys(GATES).length,
    gates: results,
    summary: allPassed
      ? "✓ All LinkedIn quality gates passed"
      : `✗ ${Object.keys(GATES).length - gatesPassed} gate(s) failed — review issues above`,
  };
}

export function printVerificationReport(result) {
  const lines = [];
  lines.push("");
  lines.push("═══════════════════════════════════════");
  lines.push("  LinkedIn Verification Report");
  lines.push("═══════════════════════════════════════");
  lines.push(`  Score: ${result.score}/100`);
  lines.push(`  Gates: ${result.gatesPassed}/${result.gatesTotal} passed`);
  lines.push(`  Status: ${result.passed ? "✓ PASSED" : "✗ NEEDS REVIEW"}`);
  lines.push("");
  for (const gate of result.gates) {
    const icon = gate.pass ? "✓" : "✗";
    const bar = gate.score >= 4 ? "█████" : gate.score >= 3 ? "███░░" : gate.score >= 1 ? "█░░░░" : "░░░░░";
    lines.push(`  ${icon} ${gate.id} ${bar} ${gate.name}`);
    lines.push(`       ${gate.details}`);
  }
  lines.push("");
  lines.push("═══════════════════════════════════════");
  return lines.join("\n");
}

export default { verifyLinkedInPost, printVerificationReport, GATES };
