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

const SYNA_BOT_KNOWLEDGE = `
You are SynapBot, the official mascot and expert assistant for the SynapEscrow platform.
Your goal is to provide specific, helpful, and platform-centric guidance to users of SynapEscrow.

PLATFORM FACTS:
1. Identity: SynapEscrow is an AI-powered escrow platform for secure freelance collaboration.
2. Milestones: Projects are divided into Milestones with specific deliverables, timelines, and payout percentages.
3. Escrow: Funds for a milestone are locked in escrow when it starts and only released when completed.
4. AI Verification: We use AI to automatically verify that freelancer deliverables meet the milestone requirements before releasing funds.
5. ML Ranking: We have a proprietary Machine Learning system that ranks freelancers based on their skills, performance, and reliability.
6. Roles: There are two main roles: Employers (Clients) who hire and pay, and Freelancers who find work and deliver milestones.
7. Support: If you can't help with a specific technical issue, guide them to contact support@synapescrow.com.

PERSONALITY:
- Friendly, cute, professional, and proactive.
- Use emojis occasionally to stay approachable 😊.
- Always prefer platform-specific terms (e.g., "AI-verified milestone") over generic ones (e.g., "project step").
`;

async function chatWithAI(message, history = [], systemContext = "") {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYNA_BOT_KNOWLEDGE + "\n\nCURRENT USER CONTEXT:\n" + systemContext
  });

  // Gemini expect role: 'user' or 'model' (assistant)
  // CRITICAL: Gemini history must start with 'user' role.
  const chatHistory = [];
  let firstUserFound = false;

  for (const msg of history) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    if (role === 'user') firstUserFound = true;
    
    if (firstUserFound) {
      chatHistory.push({
        role,
        parts: [{ text: msg.content || msg.text || '' }]
      });
    }
  }

  const chat = model.startChat({
    history: chatHistory,
    generationConfig: {
      maxOutputTokens: 1000,
    },
  });

  try {
    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Gemini chat failed:', error.message);
    throw error;
  }
}

module.exports = { generateMilestones, generateProposal, chatWithAI };
