const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function normalizeMilestones(rawMilestones = []) {
  return rawMilestones
    .map((milestone) => ({
      title: String(milestone?.title || milestone?.name || '').trim(),
      description: String(milestone?.description || '').trim(),
      deliverable: String(milestone?.deliverable || milestone?.expected_deliverable || '').trim(),
      estimated_time: String(milestone?.estimated_time || milestone?.timeline || '').trim(),
      complexity: String(milestone?.complexity || 'Medium').trim(),
      payout_percentage: Number(milestone?.payout_percentage || milestone?.payout || 0)
    }))
    .filter((milestone) => milestone.title && milestone.description);
}

function extractJsonPayload(text) {
  const trimmed = String(text || '').trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  const jsonCandidate = fencedMatch ? fencedMatch[1] : trimmed;

  return JSON.parse(jsonCandidate);
}

async function generateMilestones(description) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });

  const prompt = `
You are a senior technical project manager responsible for planning software development projects.

Break the following project into structured and realistic development milestones.

Return ONLY valid JSON in this exact structure:
{
  "project_title": "string",
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "deliverable": "string",
      "estimated_time": "string",
      "complexity": "Low | Medium | High",
      "payout_percentage": number
    }
  ]
}

Rules:
- All payout percentages across all milestones must add up to exactly 100.
- Use realistic delivery ranges such as "1-2 weeks" or "3-5 days".
- Higher complexity milestones should generally receive higher payout percentages.
- Avoid trivial or oversized milestones.
- Do not include markdown fences or explanatory text.

Project:
${description}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const parsed = extractJsonPayload(response.text());
  const milestones = normalizeMilestones(parsed?.milestones);

  return {
    project_title: String(parsed?.project_title || 'AI Generated Project Plan').trim(),
    milestones
  };
}

module.exports = { generateMilestones };
