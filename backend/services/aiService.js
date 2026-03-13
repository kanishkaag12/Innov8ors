const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateMilestones(description) {

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });

  const prompt = `
You are a senior technical project manager responsible for planning software development projects.

Break the following project into structured and realistic development milestones.

For each milestone include:
- milestone name
- description
- expected deliverable
- estimated time range in days (for example: 1–2 days, 2–4 days, etc.)
- workload complexity (Low / Medium / High)
- payout percentage of total project budget

Time estimation guidelines:
- Estimate the time realistically based on the amount of work involved.
- The time range should reflect real development effort.
- Use broader ranges when the workload uncertainty is higher.

Payout rules:
- Payout percentage must reflect the workload complexity and effort required.
- Higher complexity milestones should receive higher payout percentages.
- Smaller setup or configuration tasks should receive lower percentages.
- All payout percentages across all milestones must add up to exactly 100%.

Milestone planning guidelines:
- Break the project into logical development stages.
- Avoid extremely small or trivial milestones.
- Avoid overly large milestones.
- Aim for balanced development phases such as setup, core development, integration, testing, and deployment.

Return the result in a clean structured format.

Project:
${description}`;

   const result = await model.generateContent(prompt);

  const response = await result.response;

  return response.text();
}

module.exports = { generateMilestones };