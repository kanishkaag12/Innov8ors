const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeCode(milestone, repoCode) {

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });

  const prompt = `
You are a strict software QA engineer reviewing a GitHub repository.

Milestone Requirement:
${milestone}

Repository Code:
${repoCode}

Evaluate completion.

Rules:
Completed = 100%
Not Completed = 0%
Partially Completed = estimate percentage

Return JSON:

{
"status":"Completed | Partially Completed | Not Completed",
"completion_percentage":number,
"short_explanation":"brief reason"
}
`;

  const result = await model.generateContent(prompt);

  const response = await result.response;

  return response.text();
}

module.exports = { analyzeCode };