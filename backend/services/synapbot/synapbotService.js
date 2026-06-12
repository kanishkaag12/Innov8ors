const { retrieveRelevantContext, formatContext } = require("./knowledgeRetriever");
const { generateGemma4Answer } = require("./gemma4Service");
const Job = require("../../models/Job");
const Project = require("../../models/Project");
const Milestone = require("../../models/Milestone");
const Escrow = require("../../models/Escrow");

const SYNAPBOT_SYSTEM_PROMPT = [
  "You are SynapBot, the AI assistant for SynapEscrow.",
  "Your job is to help freelancers and clients manage jobs, contracts, milestones, escrow payments, and proposals.",
  "When a user asks about jobs, use the SearchJobs tool results provided in the context.",
  "When a user asks about milestones, use the Milestone tool results provided in the context.",
  "When a user asks about payments, use the Escrow tool results provided in the context.",
  "Never say 'I don't know' or 'I'm not sure based on current knowledge'. Instead, use the available tool outputs and platform knowledge to assist the user directly.",
  "Give concise product-support answers in 2 or 3 short sentences."
].join(" ");

const FALLBACK_UNSURE = "I can help you manage your jobs, contracts, milestones, escrow payments, and proposals. Could you please provide more details or ask a specific question?";

const futureToolHandlers = {
  SearchJobs: executeSearchJobs,
  Milestone: executeMilestoneTool,
  Escrow: executeEscrowTool
};

async function executeSearchJobs(cleanMessage) {
  try {
    const STOP_WORDS = new Set(["a", "an", "the", "and", "or", "to", "of", "for", "on", "in", "at", "with", "is", "are", "am", "be", "do", "does", "did", "can", "could", "would", "should", "how", "what", "when", "where", "why", "i", "me", "my", "we", "our", "you", "your", "this", "that", "it", "as", "from", "by", "about", "if", "into", "after", "before"]);
    const words = cleanMessage.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
    
    let dbQuery = { status: 'open' };
    if (words.length > 0) {
      dbQuery.$or = words.map(word => ({
        $or: [
          { title: { $regex: word, $options: 'i' } },
          { description: { $regex: word, $options: 'i' } },
          { requiredSkills: { $regex: word, $options: 'i' } }
        ]
      }));
    }
    
    const jobs = await Job.find(dbQuery).limit(3).lean();
    if (!jobs.length) {
      return await Job.find({ status: 'open' }).limit(3).lean();
    }
    return jobs;
  } catch (err) {
    console.error("❌ SearchJobs Tool Error:", err);
    return [];
  }
}

async function executeMilestoneTool(user) {
  try {
    if (!user) return null;
    const projects = await Project.find({
      $or: [
        { clientId: user._id },
        { freelancerId: user._id }
      ]
    }).lean();
    
    if (!projects.length) return [];
    
    const projectIds = projects.map(p => p._id);
    return await Milestone.find({ project_id: { $in: projectIds } }).populate('project_id', 'title').lean();
  } catch (err) {
    console.error("❌ Milestone Tool Error:", err);
    return [];
  }
}

async function executeEscrowTool(user) {
  try {
    if (!user) return null;
    return await Escrow.find({
      $or: [
        { clientId: user._id },
        { freelancerId: user._id }
      ]
    }).populate('projectId', 'title').lean();
  } catch (err) {
    console.error("❌ Escrow Tool Error:", err);
    return [];
  }
}

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

async function chatWithSynapBot({ message, history = [], user = null }) {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) {
    const error = new Error("Message is required.");
    error.code = "INVALID_MESSAGE";
    throw error;
  }

  let toolDataString = "";
  let executedToolName = null;
  const lowercaseMsg = cleanMessage.toLowerCase();
  
  if (/\b(job|jobs|work|find|search|apply|vacancy|vacancies|project|projects)\b/i.test(lowercaseMsg)) {
    executedToolName = "SearchJobs";
    const jobs = await executeSearchJobs(cleanMessage);
    if (jobs && jobs.length > 0) {
      toolDataString = `[Tool Output - SearchJobs] Available Open Jobs:\n` + jobs.map(j => `- "${j.title}" (Type: ${j.projectType}, Budget: $${j.budgetMin || 0}-$${j.budgetMax || 0}): ${j.description.substring(0, 150)}... Skills required: ${j.requiredSkills.join(", ")}`).join("\n");
    } else {
      toolDataString = `[Tool Output - SearchJobs] No open jobs found matching details.`;
    }
  } else if (/\b(milestone|milestones|acceptance|deliverable|deliverables|task|tasks)\b/i.test(lowercaseMsg)) {
    executedToolName = "Milestone";
    const milestones = await executeMilestoneTool(user);
    if (Array.isArray(milestones) && milestones.length > 0) {
      toolDataString = `[Tool Output - Milestone] Your Active Milestones:\n` + milestones.map(m => `- Project "${m.project_id?.title || 'Unknown'}": Milestone "${m.title}" status is ${m.status}, Payout amount: $${m.payment_amount}, Paid: $${m.amount_paid}, Left: $${m.amount_remaining}`).join("\n");
    } else if (milestones === null) {
      toolDataString = `[Tool Output - Milestone] User is not logged in. Help them understand milestones generally: milestones split projects into clear deliverables, timelines, and payout amounts in SynapEscrow.`;
    } else {
      toolDataString = `[Tool Output - Milestone] You do not have any active projects or milestone milestones registered at this moment.`;
    }
  } else if (/\b(payment|payments|escrow|pay|funds|release|funded|amount|dollar|dollars|usd)\b/i.test(lowercaseMsg)) {
    executedToolName = "Escrow";
    const escrows = await executeEscrowTool(user);
    if (Array.isArray(escrows) && escrows.length > 0) {
      toolDataString = `[Tool Output - Escrow] Your Escrow Accounts:\n` + escrows.map(e => `- Project "${e.projectId?.title || 'Unknown'}": Total Funded: $${e.totalAmount}, Released: $${e.releasedAmount}, Remaining in Escrow: $${e.remainingAmount}, Status: ${e.status}`).join("\n");
    } else if (escrows === null) {
      toolDataString = `[Tool Output - Escrow] User is not logged in. Explain how escrow payments protect funds: employer funds are held securely in escrow and released stage by stage.`;
    } else {
      toolDataString = `[Tool Output - Escrow] You do not have any escrow payment records at this moment.`;
    }
  }

  const retrieval = retrieveRelevantContext(cleanMessage, 3);
  const matchedEntries = retrieval.matches.map((item) => `${item.id}:${item.score}`).join(", ") || "none";
  const bestMatch = retrieval.matches[0];
  console.log(
    `[SynapBot][retrieval] query="${cleanMessage.substring(0, 80)}" tool=${executedToolName} normalized="${retrieval.normalizedQuery}" platform=${retrieval.isPlatformQuery} confidence=${retrieval.confidence} score=${retrieval.topScore} matches=${matchedEntries}`
  );

  const hasUsefulContext = (retrieval.matches.length > 0 && retrieval.topScore >= 12) || !!toolDataString;

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

  const contextText = formatContext(retrieval.matches);

  const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
  const historyText = recentHistory
    .map((item) => `${item.role === "assistant" ? "Assistant" : "User"}: ${item.content || ""}`)
    .join("\n");

  const userPrompt = [
    `SynapEscrow context:\n${contextText}`,
    toolDataString ? `Real-Time Tool Context:\n${toolDataString}` : "",
    `Recent conversation:\n${historyText || "(none)"}`,
    `Question: ${cleanMessage}`,
    "Answer as SynapBot in 2-3 short sentences using only the SynapEscrow context and Real-Time Tool Context above.",
    "If the query cannot be answered by the context, explain to the user how they can use SynapEscrow features to perform the action."
  ].filter(Boolean).join("\n");

  let finalReply;
  try {
    const reply = await generateGemma4Answer({
      systemPrompt: SYNAPBOT_SYSTEM_PROMPT,
      userPrompt
    });

    const cleanedReply = cleanSynapBotReply(reply);
    finalReply = hasModelLeakage(cleanedReply)
      ? (toolDataString ? cleanedReply : buildContextAnswer(retrieval.matches))
      : cleanedReply;

    if (finalReply !== cleanedReply) {
      console.log("[SynapBot][fallback] reason=model-leakage-replaced-with-context-answer");
    }
  } catch (error) {
    console.error("⚠️ SynapBot model generation failed completely. Falling back to retrieved context/tool content. Error:", error.message);
    finalReply = toolDataString ? `I retrieved this information for you: ${toolDataString.substring(0, 200)}...` : buildContextAnswer(retrieval.matches);
  }

  if (finalReply === FALLBACK_UNSURE && toolDataString) {
    finalReply = `Here are the latest details from our platform: ` + toolDataString.replace(/\[Tool Output - \w+\]/g, "").trim().substring(0, 180) + "...";
  }

  console.log(
    `[SynapBot][answer] contextUsed=${retrieval.matches.map((item) => item.id).join(", ")} tool=${executedToolName} fallbackReason=${finalReply === FALLBACK_UNSURE ? "model-unsure" : "none"}`
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
