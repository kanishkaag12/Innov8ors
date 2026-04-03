const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function extractJsonPayload(text) {
  const trimmed = String(text || "").trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  const jsonCandidate = fencedMatch ? fencedMatch[1] : trimmed;
  return JSON.parse(jsonCandidate);
}

function normalizeCompletion(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Math.min(100, Math.max(0, Math.round(numeric)));
  }
  return 0;
}

function normalizeStatus(rawStatus, completion) {
  const value = String(rawStatus || "").toLowerCase().trim();

  if (value.includes("fully")) {
    return "Fully Completed";
  }

  if (value.includes("partial")) {
    return "Partially Completed";
  }

  if (value.includes("unmet") || value.includes("not completed") || value.includes("incomplete")) {
    return "Unmet";
  }

  if (completion >= 85) {
    return "Fully Completed";
  }

  if (completion >= 25) {
    return "Partially Completed";
  }

  return "Unmet";
}

function normalizeRecommendedAction(rawAction, status) {
  const value = String(rawAction || "").toLowerCase().trim();

  if (value.includes("immediate payment")) {
    return "Trigger immediate payment";
  }

  if (value.includes("pro-rated") || value.includes("feedback")) {
    return "Trigger feedback or pro-rated release";
  }

  if (value.includes("refund")) {
    return "Initiate employer refund protocol";
  }

  if (status === "Fully Completed") {
    return "Trigger immediate payment";
  }

  if (status === "Partially Completed") {
    return "Trigger feedback or pro-rated release";
  }

  return "Initiate employer refund protocol";
}

function scoreStatus(status) {
  if (status === "Fully Completed") return 3;
  if (status === "Partially Completed") return 2;
  return 1; // Unmet
}

function statusByScore(score) {
  if (score >= 3) return "Fully Completed";
  if (score === 2) return "Partially Completed";
  return "Unmet";
}

function mergeStatus(aiStatus, heuristicStatus) {
  const aiScore = scoreStatus(aiStatus);
  const heuristicScore = scoreStatus(heuristicStatus);
  return statusByScore(Math.min(aiScore, heuristicScore));
}

function shouldPromoteToPartial(status, assessment, shortExplanation) {
  if (status !== "Unmet") {
    return false;
  }

  const text = `${assessment || ""} ${shortExplanation || ""}`.toLowerCase();

  const positiveSignals = [
    "contains foundational elements",
    "foundational elements",
    "strong architectural foundation",
    "meaningful implementation",
    "partial milestone coverage",
    "provides a strong architectural foundation",
    "includes",
    "present",
    "data models",
    "frontend dashboard",
    "repository structure",
    "authentication",
    "project and milestone"
  ];

  const missingSignals = [
    "however",
    "but",
    "missing",
    "absent",
    "not been met",
    "not fully satisfied",
    "lacks",
    "no discernible code",
    "core backend logic"
  ];

  return positiveSignals.some((signal) => text.includes(signal)) &&
    missingSignals.some((signal) => text.includes(signal));
}

function hasAny(text, patterns = []) {
  return patterns.some((pattern) => text.includes(pattern));
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "into", "your", "have", "will", "would",
  "should", "could", "project", "description", "deliverable", "milestone", "requirement",
  "build", "create", "using", "flow", "requirement", "implementation", "completed", "partial",
  "status", "result", "action", "recommended", "percentage", "short", "explanation", "assessment",
  "application", "development", "full", "stack", "simple", "complex", "backend", "frontend", "design"
]);

function buildHeuristicEvaluation(milestone, repoCode, projectTitle = "") {
  const milestoneText = String(milestone || "").toLowerCase();
  const repoText = String(repoCode || "").toLowerCase();
  const projectText = String(projectTitle || "").toLowerCase();

  // 1. Identify Project Entities (e.g. 'tic-tac-toe' -> ['tic', 'tac', 'toe'])
  const projectEntities = Array.from(
    new Set(
      projectText
        .split(/[^a-z0-9]+/)
        .filter((word) => word && word.length >= 3 && !STOP_WORDS.has(word))
    )
  );

  // 2. Alignment Check: Does the repo contain ANY mention of the project's core entities?
  const entityMatches = projectEntities.filter((entity) => repoText.includes(entity));
  
  // CRITICAL: If the project is 'Tic-Tac-Toe' but the repo doesn't mention 'tic' or 'tac' or 'toe' anywhere, 
  // it is almost certainly the wrong repository.
  if (projectEntities.length > 0 && entityMatches.length === 0) {
    return {
      status: "Unmet",
      completion_percentage: 0,
      recommended_action: "Initiate employer refund protocol",
      assessment: `Project mismatch detected. The repository appears to be for a different project (contains no matches for "${projectEntities.join(", ")}"). Verification was rejected to prevent fraudulent submissions.`
    };
  }

  // 3. Milestone Keyword Matching
  const milestoneKeywords = Array.from(
    new Set(
      milestoneText
        .split(/[^a-z0-9]+/)
        .filter((word) => word && word.length >= 4 && !STOP_WORDS.has(word))
    )
  );
  const keywordMatches = milestoneKeywords.filter((word) => repoText.includes(word));

  const milestoneKeywordThreshold = Math.max(2, Math.ceil(milestoneKeywords.length * 0.25));
  
  // 4. Dynamic Signals Based on Milestone Intent
  const evidence = [];
  
  if (hasAny(milestoneText, ["ui", "frontend", "interface", "dashboard", "page"])) {
    if (hasAny(repoText, ["components/", "pages/", "src/app", "frontend/", ".jsx", ".tsx"])) {
      evidence.push("frontend UI implementation");
    }
  }

  if (hasAny(milestoneText, ["api", "backend", "server", "routes", "controller"])) {
    if (hasAny(repoText, ["routes/", "controllers/", "api/", "server.js", "app.js", "backend/"])) {
      evidence.push("backend API logic");
    }
  }

  if (hasAny(milestoneText, ["db", "database", "model", "schema", "persistence"])) {
    if (hasAny(repoText, ["models/", "schema/", "db.js", "mongoose", "prisma", "sequelize"])) {
      evidence.push("database schema and models");
    }
  }

  if (hasAny(milestoneText, ["auth", "login", "user", "security"])) {
    if (hasAny(repoText, ["auth", "login", "signup", "jwt", "passwords", "bcrypt"])) {
      evidence.push("authentication/security modules");
    }
  }

  if (hasAny(milestoneText, ["payment", "escrow", "payout", "stripe", "razorpay"])) {
    if (hasAny(repoText, ["payment", "escrow", "stripe", "razorpay", "checkout"])) {
      evidence.push("payment integration logic");
    }
  }

  // Add project-specific evidence if we have entity matches
  if (entityMatches.length > 0) {
    evidence.push(`core domain logic for "${entityMatches.join(", ")}"`);
  }

  const evidenceCount = evidence.length;
  const repoAppearsRelevant = entityMatches.length > 0 && (keywordMatches.length >= 2 || evidenceCount >= 1);

  if (!repoAppearsRelevant) {
    return {
      status: "Unmet",
      completion_percentage: 10,
      recommended_action: "Initiate employer refund protocol",
      assessment:
        `The repository code does not align with the "${projectTitle}" project or the specific milestone requirements.`
    };
  }

  if (evidenceCount >= 3 || (evidenceCount >= 1 && keywordMatches.length >= 5)) {
    return {
      status: "Fully Completed",
      completion_percentage: 92,
      recommended_action: "Trigger immediate payment",
      assessment: `Repository verification successful. Found conclusive evidence of ${evidence.join(", ")} matching the project domain.`
    };
  }

  if (evidenceCount >= 1) {
    return {
      status: "Partially Completed",
      completion_percentage: 55,
      recommended_action: "Trigger feedback or pro-rated release",
      assessment: `Meaningful implementation found for ${evidence.join(", ")}, though some milestone deliverables may still be pending.`
    };
  }

  return {
    status: "Unmet",
    completion_percentage: 20,
    recommended_action: "Initiate employer refund protocol",
    assessment: `Weak evidence found. The repository mentions the project but does not implement the specific milestone requirements.`
  };
}

async function analyzeCode(milestone, repoCode, projectTitle = "Software Project") {
  if (!repoCode || !/File:\s*/i.test(repoCode)) {
    return {
      status: "Unmet",
      completion_percentage: 0,
      short_explanation: "No accessible repository code files found for verification.",
      assessment:
        "Unable to inspect code because the repository appears empty, inaccessible, or not a valid GitHub repository.",
      recommended_action: "Initiate employer refund protocol"
    };
  }

  const prompt = `
You are a strict software QA engineer reviewing a GitHub repository.

PROJECT CONTEXT:
The freelancer is working on a project titled: "${projectTitle}"

MILESTONE REQUIREMENT:
${milestone}

REPOSITORY CODE:
${repoCode}

YOUR TASK:
1. First, verify if this repository actually belongs to the project "${projectTitle}".
2. If the code is for a COMPLETELY DIFFERENT project (e.g. user submitted an Escrow platform code for a Tic-Tac-Toe project), you MUST mark it as "Unmet" with 0% completion.
3. If it is the correct project, evaluate if the provided code satisfies the milestone.

Evaluation Rubric:
- **Fully Completed**: ALL key deliverables for this milestone are implemented in the correct project context.
- **Partially Completed**: Significant progress made in the correct project context, but missing features.
- **Unmet**: Wrong project submitted, or no relevant implementation found.

Return ONLY valid JSON:
{
  "status": "Fully Completed | Partially Completed | Unmet",
  "completion_percentage": number,
  "short_explanation": "A one-sentence summary",
  "assessment": "Detailed 3-4 sentence technical evaluation citing specific code evidence.",
  "recommended_action": "Trigger immediate payment | Trigger feedback or pro-rated release | Initiate employer refund protocol"
}
`;

  const heuristicResult = buildHeuristicEvaluation(milestone, repoCode, projectTitle);

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const parsed = extractJsonPayload(chatCompletion.choices[0].message.content);
    const completion = normalizeCompletion(parsed?.completion_percentage || 0);
    let status = normalizeStatus(parsed?.status, completion);
    let recommendedAction = normalizeRecommendedAction(parsed?.recommended_action, status);
    let assessment = String(parsed?.assessment || "").trim();
    const shortExplanation = String(parsed?.short_explanation || "").trim();
    let normalizedCompletion = completion;

    // Use Heuristic to veto AI if project mismatch is detected
    if (heuristicResult) {
      const mergedStatus = mergeStatus(status, heuristicResult.status);
      if (mergedStatus !== status) {
        status = mergedStatus;
        normalizedCompletion = Math.min(normalizedCompletion, heuristicResult.completion_percentage);
        recommendedAction = normalizeRecommendedAction("", status);
        assessment = `${heuristicResult.assessment} (Technical verification overrode AI interpretation)`;
      }
    }

    return {
      status,
      completion_percentage: normalizedCompletion,
      short_explanation: shortExplanation,
      assessment: assessment || "No detailed assessment provided.",
      recommended_action: recommendedAction
    };
  } catch (error) {
    console.error("GROQ AUDIT FAILED:", error.message);
    if (heuristicResult) {
      return {
        ...heuristicResult,
        short_explanation: "Results generated from structural evidence.",
        assessment: heuristicResult.assessment
      };
    }
    throw error;
  }
}

module.exports = { analyzeCode };
