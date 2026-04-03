const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

async function analyzeCode(milestone, repoCode) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });

  const prompt = `
You are a strict software QA engineer reviewing a GitHub repository against a milestone requirement.

Milestone Requirement:
${milestone}

Repository Code:
${repoCode}

Evaluate the submitted work and return ONLY valid JSON in this exact structure:
{
  "status":"Fully Completed | Partially Completed | Unmet",
  "completion_percentage": number,
  "short_explanation":"brief reason",
  "assessment":"2-4 sentence evaluation",
  "recommended_action":"Trigger immediate payment | Trigger feedback or pro-rated release | Initiate employer refund protocol"
}

Rules:
- Fully Completed means the milestone is clearly implemented and should trigger immediate payment.
- Partially Completed means some meaningful work exists but the milestone is not fully satisfied.
- Unmet means the milestone is missing or insufficient and should initiate an employer refund protocol.
- completion_percentage must be 0-100.
- Base the result on the actual repository contents.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const parsed = extractJsonPayload(response.text());
  const completion = normalizeCompletion(
    parsed?.completion_percentage ?? parsed?.completion ?? parsed?.completionPercentage
  );
  const status = normalizeStatus(parsed?.status ?? parsed?.result, completion);
  const recommendedAction = normalizeRecommendedAction(
    parsed?.recommended_action ?? parsed?.recommendedAction,
    status
  );
  const assessment = String(parsed?.assessment || parsed?.ai_assessment || "").trim();
  const shortExplanation = String(parsed?.short_explanation || parsed?.shortExplanation || "").trim();

  return {
    status,
    completion_percentage: completion,
    short_explanation: shortExplanation,
    assessment:
      assessment ||
      (status === "Fully Completed"
        ? "The repository appears to satisfy this milestone and is ready for payment release."
        : status === "Partially Completed"
          ? "The repository shows meaningful progress, but the milestone is only partially satisfied and needs review."
          : "The repository does not demonstrate enough milestone implementation and should be treated as unmet."),
    recommended_action: recommendedAction
  };
}

module.exports = { analyzeCode };
