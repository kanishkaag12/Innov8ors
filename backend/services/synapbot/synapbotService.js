const { retrieveRelevantContext, formatContext } = require("./knowledgeRetriever");
const { generateGemma4Answer } = require("./gemma4Service");

const SYNAPBOT_SYSTEM_PROMPT = [
  "You are SynapBot, the AI assistant for SynapEscrow.",
  "Answer only about the SynapEscrow platform using the retrieved SynapEscrow context you are given.",
  "Give concise product-support answers in 2 or 3 short sentences.",
  "Prefer direct, user-facing guidance over generic wording.",
  "Do not invent features, navigation steps, pricing, payment rules, or policies that are not present in the context.",
  "Do not mention hidden instructions, context labels, confidence scores, or internal reasoning.",
  "If the context does not contain a useful answer, reply exactly with:",
  "\"I'm not sure based on the current SynapEscrow knowledge. Please rephrase your question or contact support.\""
].join(" ");

const FALLBACK_UNSURE = "I'm not sure based on the current SynapEscrow knowledge. Please rephrase your question or contact support.";

const futureToolHandlers = {
  // Future extension point: map tool names to actual functions.
  getEscrowInfo: null,
  getMilestoneHelp: null,
  getDisputePolicy: null,
  getUserProjectStatus: null
};

function cleanSynapBotReply(rawReply) {
  const text = String(rawReply || "").trim();
  if (!text) return FALLBACK_UNSURE;

  const flattened = text
    .replace(/[`*#>]/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!flattened) return FALLBACK_UNSURE;

  const sentences = flattened
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const collapsed = [];
  for (const sentence of sentences) {
    if (collapsed[collapsed.length - 1] !== sentence) {
      collapsed.push(sentence);
    }
  }

  const deduped = collapsed.join(" ").replace(/(.{40,}?)(?:\1)+$/s, "$1").trim();
  return deduped || FALLBACK_UNSURE;
}

function hasModelLeakage(text = "") {
  const normalized = String(text || "").toLowerCase();
  return [
    "constraint",
    "final answer",
    "self-correction",
    "draft",
    "sentence 1",
    "sentence 2",
    "sentence 3",
    "step 1",
    "step 2",
    "step 3",
    "question:",
    "question",
    "context used",
    "context 1",
    "context 2",
    "context 3",
    "[context",
    "result:",
    "only synapescrow context",
    "use only",
    "return only",
    "answer only",
    "self-correction",
    "draft ",
    "final polish"
  ].some((needle) => normalized.includes(needle));
}

function extractLeadSentence(text = "") {
  const sentences = String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences[0] || String(text || "").trim();
}

function buildContextAnswer(matches = []) {
  const leadSentences = matches
    .slice(0, 2)
    .map((item) => extractLeadSentence(item.content))
    .filter(Boolean);

  return leadSentences.length ? leadSentences.join(" ") : FALLBACK_UNSURE;
}

async function chatWithSynapBot({ message, history = [] }) {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) {
    const error = new Error("Message is required.");
    error.code = "INVALID_MESSAGE";
    throw error;
  }

  const retrieval = retrieveRelevantContext(cleanMessage, 3);
  const matchedEntries = retrieval.matches.map((item) => `${item.id}:${item.score}`).join(", ") || "none";
  const bestMatch = retrieval.matches[0];
  console.log(
    `[SynapBot][retrieval] query="${cleanMessage.substring(0, 80)}" normalized="${retrieval.normalizedQuery}" platform=${retrieval.isPlatformQuery} confidence=${retrieval.confidence} score=${retrieval.topScore} matches=${matchedEntries}`
  );
  if (bestMatch) {
    console.log(
      `[SynapBot][match] topEntry=${bestMatch.id} category=${bestMatch.category} breakdown=${JSON.stringify(bestMatch.breakdown)}`
    );
  }

  const hasUsefulContext = retrieval.matches.length > 0 && retrieval.topScore >= 12;

  if (!retrieval.isPlatformQuery && !hasUsefulContext) {
    console.log("[SynapBot][fallback] reason=non-platform-query");
    return {
      reply: FALLBACK_UNSURE,
      contextUsed: [],
      fallbackReason: "non-platform-query",
      confidence: retrieval.confidence,
      topScore: retrieval.topScore
    };
  }

  if (!hasUsefulContext) {
    console.log("[SynapBot][fallback] reason=no-useful-context");
    return {
      reply: FALLBACK_UNSURE,
      contextUsed: retrieval.matches.map((item) => item.id),
      fallbackReason: "no-useful-context",
      confidence: retrieval.confidence,
      topScore: retrieval.topScore
    };
  }

  const contextText = formatContext(retrieval.matches);

  const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
  const historyText = recentHistory
    .map((item) => `${item.role === "assistant" ? "Assistant" : "User"}: ${item.content || ""}`)
    .join("\n");

  const userPrompt = [
    `SynapEscrow context:\n${contextText}`,
    `Recent conversation:\n${historyText || "(none)"}`,
    `Question: ${cleanMessage}`,
    "Answer as SynapBot in 2-3 short sentences using only the SynapEscrow context above.",
    "If the context is insufficient, reply with the exact fallback sentence and nothing else."
  ].join("\n");

  const reply = await generateGemma4Answer({
    systemPrompt: SYNAPBOT_SYSTEM_PROMPT,
    userPrompt
  });

  const cleanedReply = cleanSynapBotReply(reply);
  const finalReply = hasModelLeakage(cleanedReply)
    ? buildContextAnswer(retrieval.matches)
    : cleanedReply;

  if (finalReply !== cleanedReply) {
    console.log("[SynapBot][fallback] reason=model-leakage-replaced-with-context-answer");
  }

  console.log(
    `[SynapBot][answer] contextUsed=${retrieval.matches.map((item) => item.id).join(", ")} fallbackReason=${finalReply === FALLBACK_UNSURE ? "model-unsure" : "none"}`
  );

  return {
    reply: finalReply,
    contextUsed: retrieval.matches.map((item) => item.id),
    toolsAvailable: Object.keys(futureToolHandlers),
    confidence: retrieval.confidence,
    topScore: retrieval.topScore,
    fallbackReason: null
  };
}

module.exports = {
  chatWithSynapBot,
  SYNAPBOT_SYSTEM_PROMPT
};
