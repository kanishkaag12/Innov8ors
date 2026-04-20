const knowledgeBase = require("../../data/synapbotKnowledgeBase.json");

const GENERIC_PLATFORM_HINTS = [
  "this website",
  "this platform",
  "your website",
  "your platform",
  "this app",
  "your app",
  "how does this work",
  "what can i do here"
];

const SUPPORT_INTENT_TERMS = new Set([
  "feature",
  "features",
  "website",
  "platform",
  "app",
  "login",
  "signin",
  "sign",
  "signup",
  "register",
  "account",
  "dashboard",
  "freelancer",
  "employer",
  "client",
  "milestone",
  "milestones",
  "escrow",
  "payment",
  "payments",
  "release",
  "fund",
  "funding",
  "proposal",
  "project",
  "projects",
  "dispute",
  "support",
  "verify",
  "verification"
]);

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "for",
  "on",
  "in",
  "at",
  "with",
  "is",
  "are",
  "am",
  "be",
  "do",
  "does",
  "did",
  "can",
  "could",
  "would",
  "should",
  "how",
  "what",
  "when",
  "where",
  "why",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "this",
  "that",
  "it",
  "as",
  "from",
  "by",
  "about",
  "if",
  "into",
  "after",
  "before"
]);

const PHRASE_NORMALIZATIONS = [
  [/log\s*in/g, " login "],
  [/sign\s*in/g, " login "],
  [/sign\s*up/g, " signup "],
  [/create\s+account/g, " signup "],
  [/register/g, " signup "],
  [/client/g, " employer "],
  [/buyer/g, " employer "],
  [/hirer/g, " employer "],
  [/contractor/g, " freelancer "],
  [/seller/g, " freelancer "],
  [/worker/g, " freelancer "],
  [/secure\s+payment/g, " escrow "],
  [/held\s+funds/g, " escrow "],
  [/release\s+funds/g, " payment release "],
  [/release\s+payment/g, " payment release "],
  [/main\s+features/g, " features "],
  [/key\s+features/g, " features "],
  [/what\s+can\s+i\s+do\s+here/g, " platform features "],
  [/this\s+website/g, " synapescrow platform "],
  [/your\s+website/g, " synapescrow platform "],
  [/this\s+platform/g, " synapescrow platform "],
  [/your\s+platform/g, " synapescrow platform "],
  [/this\s+app/g, " synapescrow platform "],
  [/your\s+app/g, " synapescrow platform "]
];

function normalizeText(text = "") {
  let normalized = ` ${String(text).toLowerCase()} `;

  for (const [pattern, replacement] of PHRASE_NORMALIZATIONS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text = "") {
  return normalizeText(text)
    .split(" ")
    .filter(Boolean);
}

function toMeaningfulTokenSet(tokens = []) {
  return new Set(tokens.filter((token) => token && !STOP_WORDS.has(token)));
}

function countOverlap(leftSet, rightSet) {
  let matches = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) {
      matches += 1;
    }
  }
  return matches;
}

function countPhraseMatches(query, phrases = []) {
  if (!query) return 0;

  return phrases.reduce((count, phrase) => {
    const normalizedPhrase = normalizeText(phrase);
    if (!normalizedPhrase) return count;
    return count + (query.includes(normalizedPhrase) ? 1 : 0);
  }, 0);
}

function buildEntryIndex(entry) {
  const questions = Array.isArray(entry.questions) ? entry.questions : [];
  const keywords = Array.isArray(entry.keywords) ? entry.keywords : [];

  const titleText = normalizeText(entry.title);
  const questionText = normalizeText(questions.join(" "));
  const keywordText = normalizeText(keywords.join(" "));
  const contentText = normalizeText(entry.content);
  const fullText = normalizeText([entry.title, ...questions, ...keywords, entry.content].join(" "));

  return {
    ...entry,
    searchable: {
      titleText,
      questionText,
      keywordText,
      contentText,
      fullText,
      titleTokens: toMeaningfulTokenSet(tokenize(entry.title)),
      questionTokens: toMeaningfulTokenSet(tokenize(questions.join(" "))),
      keywordTokens: toMeaningfulTokenSet(tokenize(keywords.join(" "))),
      contentTokens: toMeaningfulTokenSet(tokenize(entry.content)),
      fullTokens: toMeaningfulTokenSet(tokenize(fullText))
    }
  };
}

const SEARCHABLE_KNOWLEDGE_BASE = knowledgeBase.map(buildEntryIndex);

function scoreEntry(normalizedQuery, queryTokens, entry) {
  const queryTokenSet = toMeaningfulTokenSet(queryTokens);
  const queryTokenCount = queryTokenSet.size || 1;

  const phraseHits =
    countPhraseMatches(normalizedQuery, entry.questions) * 18 +
    countPhraseMatches(normalizedQuery, entry.keywords) * 10 +
    (entry.searchable.titleText && normalizedQuery.includes(entry.searchable.titleText) ? 14 : 0);

  const titleOverlap = countOverlap(queryTokenSet, entry.searchable.titleTokens);
  const questionOverlap = countOverlap(queryTokenSet, entry.searchable.questionTokens);
  const keywordOverlap = countOverlap(queryTokenSet, entry.searchable.keywordTokens);
  const contentOverlap = countOverlap(queryTokenSet, entry.searchable.contentTokens);
  const fullOverlap = countOverlap(queryTokenSet, entry.searchable.fullTokens);
  const coverage = fullOverlap / queryTokenCount;

  let score = 0;
  score += phraseHits;
  score += titleOverlap * 7;
  score += questionOverlap * 8;
  score += keywordOverlap * 6;
  score += contentOverlap * 3;
  score += Math.round(coverage * 25);

  if (coverage >= 0.8) score += 10;
  if (coverage >= 0.5) score += 6;
  if (entry.searchable.fullText.includes(normalizedQuery) && normalizedQuery.length > 12) {
    score += 12;
  }

  return {
    score,
    breakdown: {
      phraseHits,
      titleOverlap,
      questionOverlap,
      keywordOverlap,
      contentOverlap,
      coverage: Number(coverage.toFixed(2))
    }
  };
}

function inferPlatformQuery(normalizedQuery, queryTokens, rankedMatches) {
  if (!normalizedQuery) return false;

  if (GENERIC_PLATFORM_HINTS.some((hint) => normalizedQuery.includes(normalizeText(hint)))) {
    return true;
  }

  const queryTokenSet = toMeaningfulTokenSet(queryTokens);
  if ([...queryTokenSet].some((token) => SUPPORT_INTENT_TERMS.has(token))) {
    return true;
  }

  const topScore = rankedMatches[0]?.score || 0;
  return topScore >= 18;
}

function getConfidence(topScore) {
  if (topScore >= 45) return "high";
  if (topScore >= 24) return "medium";
  if (topScore >= 12) return "low";
  return "none";
}

function retrieveRelevantContext(query, limit = 3) {
  const normalizedQuery = normalizeText(query);
  const queryTokens = tokenize(query);

  const ranked = SEARCHABLE_KNOWLEDGE_BASE
    .map((entry) => {
      const { score, breakdown } = scoreEntry(normalizedQuery, queryTokens, entry);
      return {
        entry,
        score,
        breakdown
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const topScore = ranked[0]?.score || 0;
  const confidence = getConfidence(topScore);
  const isPlatformQuery = inferPlatformQuery(normalizedQuery, queryTokens, ranked);

  return {
    isPlatformQuery,
    confidence,
    topScore,
    normalizedQuery,
    matches: ranked.map((item) => ({
      id: item.entry.id,
      title: item.entry.title,
      category: item.entry.category,
      content: item.entry.content,
      keywords: item.entry.keywords,
      questions: item.entry.questions,
      score: item.score,
      breakdown: item.breakdown
    }))
  };
}

function formatContext(matches = []) {
  if (!matches.length) {
    return "No matching SynapEscrow knowledge base entries found.";
  }

  return matches
    .map((item, index) => {
      const sampleQuestions = Array.isArray(item.questions) && item.questions.length
        ? `Common questions: ${item.questions.slice(0, 2).join(" | ")}`
        : null;

      return [
        `[Context ${index + 1}] ${item.title}`,
        `Category: ${item.category}`,
        sampleQuestions,
        `Details: ${item.content}`
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

module.exports = {
  retrieveRelevantContext,
  formatContext,
  normalizeText
};
