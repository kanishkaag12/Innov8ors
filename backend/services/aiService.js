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

async function generateProposal(job, freelancerProfile) {
  const fallbackProposal = [
    `Hello, I would love to help with "${job.title}".`,
    freelancerProfile?.headline ? `My background: ${freelancerProfile.headline}.` : null,
    freelancerProfile?.skills?.length ? `Relevant skills: ${freelancerProfile.skills.join(', ')}.` : null,
    freelancerProfile?.bio ? `Briefly about me: ${freelancerProfile.bio}.` : null,
    `Based on your requirements in ${job.category}, I can deliver a clear implementation plan, communicate progress consistently, and move quickly on the highest-priority work first.`,
    job.projectType === 'hourly'
      ? `I am comfortable working within your hourly budget range of $${job.budgetMin || ''}-$${job.budgetMax || ''}.`
      : `I can propose a scoped delivery within your budget range of $${job.budgetMin || ''}-$${job.budgetMax || ''}.`,
    'If helpful, I can start with a short kickoff outline and first milestone immediately.'
  ].filter(Boolean).join(' ');

  if (!process.env.GEMINI_API_KEY) {
    return fallbackProposal;
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });

  const prompt = `
You are a professional freelancer writing a compelling proposal for a job.

Job Details:
Title: ${job.title}
Description: ${job.description}
Required Skills: ${job.requiredSkills.join(', ')}
Category: ${job.category}
Budget: $${job.budgetMin} - $${job.budgetMax}
Project Type: ${job.projectType}

Freelancer Profile:
Name: ${freelancerProfile?.name || 'Freelancer'}
Headline: ${freelancerProfile?.headline || ''}
Bio: ${freelancerProfile?.bio || ''}
Skills: ${freelancerProfile?.skills?.join(', ') || ''}
Experience Level: ${freelancerProfile?.experienceLevel || ''}
Preferred Budget: $${freelancerProfile?.preferredBudgetMin} - $${freelancerProfile?.preferredBudgetMax}

Write a professional proposal that:
- Introduces the freelancer
- Highlights relevant experience and skills
- Explains why they are a good fit
- Proposes a timeline and approach
- Includes a competitive bid within the budget range
- Is concise but compelling

Return ONLY the proposal text, no markdown or extra formatting.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Gemini proposal generation failed, using fallback proposal:', error.message);
    return fallbackProposal;
  }
}

module.exports = { generateMilestones, generateProposal };
