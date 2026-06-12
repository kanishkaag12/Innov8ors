const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

function hasUsableGeminiKey() {
  return Boolean(
    GEMINI_API_KEY &&
      !['your_existing_key', 'your_api_key', 'replace_me'].includes(String(GEMINI_API_KEY).trim().toLowerCase())
  );
}

function buildProjectTitle(description = '') {
  const cleaned = String(description)
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .trim();

  if (!cleaned) {
    return 'Software Development Project';
  }

  const words = cleaned.split(' ').filter(Boolean).slice(0, 7);
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildFallbackMilestones(description = '') {
  const lowerDescription = String(description).toLowerCase();
  const isSimpleSite = /(website|landing|portfolio|cafe|restaurant|menu|gallery)/.test(lowerDescription);
  const isApp = /(app|platform|dashboard|backend|api|full[-\s]?stack|mobile|web app)/.test(lowerDescription);

  if (isSimpleSite && !isApp) {
    return {
      project_title: buildProjectTitle(description),
      milestones: normalizeMilestones([
        {
          title: 'Requirements & Site Structure',
          description: 'Confirm page list, content sections, visual direction, and user flows before implementation.',
          deliverable: 'Approved sitemap, content outline, and implementation checklist.',
          estimated_time: '2-3 days',
          complexity: 'Low',
          payout_percentage: 20
        },
        {
          title: 'Core Website Build',
          description: 'Build the main responsive pages with reusable sections, navigation, and polished styling.',
          deliverable: 'Responsive website pages matching the agreed structure.',
          estimated_time: '4-6 days',
          complexity: 'Medium',
          payout_percentage: 40
        },
        {
          title: 'Forms, Media & Content Integration',
          description: 'Add contact handling, menu or gallery content, media assets, and required business details.',
          deliverable: 'Functional contact flow and complete content/media integration.',
          estimated_time: '2-4 days',
          complexity: 'Medium',
          payout_percentage: 25
        },
        {
          title: 'Testing, Revisions & Launch Prep',
          description: 'Test across devices, fix content or layout issues, optimize performance, and prepare deployment.',
          deliverable: 'QA-tested launch-ready website.',
          estimated_time: '2-3 days',
          complexity: 'Low',
          payout_percentage: 15
        }
      ])
    };
  }

  return {
    project_title: buildProjectTitle(description),
    milestones: normalizeMilestones([
      {
        title: 'Discovery & Technical Planning',
        description: 'Clarify scope, define core features, identify integrations, and prepare the technical delivery plan.',
        deliverable: 'Feature breakdown, architecture notes, and milestone acceptance criteria.',
        estimated_time: '3-5 days',
        complexity: 'Medium',
        payout_percentage: 20
      },
      {
        title: 'Foundation & Core Architecture',
        description: 'Set up the project structure, data models, authentication or access flow, and core infrastructure.',
        deliverable: 'Working project foundation with core modules wired together.',
        estimated_time: '1-2 weeks',
        complexity: 'High',
        payout_percentage: 30
      },
      {
        title: 'Feature Implementation',
        description: 'Build the main user-facing workflows, business logic, API endpoints, and required integrations.',
        deliverable: 'Functional implementation of the primary project features.',
        estimated_time: '2-3 weeks',
        complexity: 'High',
        payout_percentage: 35
      },
      {
        title: 'QA, Polish & Handover',
        description: 'Test critical flows, fix defects, improve usability, document handover notes, and prepare release.',
        deliverable: 'Tested release candidate with handover documentation.',
        estimated_time: '1 week',
        complexity: 'Medium',
        payout_percentage: 15
      }
    ])
  };
}

function normalizePayoutPercentages(milestones) {
  if (!milestones.length) {
    return milestones;
  }

  const total = milestones.reduce((sum, milestone) => sum + Number(milestone.payout_percentage || 0), 0);
  if (total <= 0) {
    const base = Math.floor(100 / milestones.length);
    let remaining = 100;
    return milestones.map((milestone, index) => {
      const payout = index === milestones.length - 1 ? remaining : base;
      remaining -= payout;
      return { ...milestone, payout_percentage: payout };
    });
  }

  let assigned = 0;
  return milestones.map((milestone, index) => {
    const payout =
      index === milestones.length - 1
        ? 100 - assigned
        : Math.max(1, Math.round((Number(milestone.payout_percentage || 0) / total) * 100));
    assigned += payout;
    return { ...milestone, payout_percentage: payout };
  });
}

function normalizeMilestones(rawMilestones = []) {
  const milestones = rawMilestones
    .map((milestone) => ({
      title: String(milestone?.title || milestone?.name || '').trim(),
      description: String(milestone?.description || '').trim(),
      deliverable: String(milestone?.deliverable || milestone?.expected_deliverable || '').trim(),
      estimated_time: String(milestone?.estimated_time || milestone?.timeline || '').trim(),
      complexity: String(milestone?.complexity || 'Medium').trim(),
      payout_percentage: Number(milestone?.payout_percentage || milestone?.payout || 0)
    }))
    .filter((milestone) => milestone.title && milestone.description);

  return normalizePayoutPercentages(milestones);
}

function extractJsonPayload(text) {
  const trimmed = String(text || '').trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  const jsonCandidate = fencedMatch ? fencedMatch[1] : trimmed;

  try {
    return JSON.parse(jsonCandidate);
  } catch (error) {
    const firstBrace = jsonCandidate.indexOf('{');
    const lastBrace = jsonCandidate.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(jsonCandidate.slice(firstBrace, lastBrace + 1));
    }

    throw error;
  }
}

async function generateMilestones(description) {
  if (!hasUsableGeminiKey()) {
    return buildFallbackMilestones(description);
  }

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

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const parsed = extractJsonPayload(response.text());
    const milestones = normalizeMilestones(parsed?.milestones);

    if (!milestones.length) {
      throw new Error('Gemini returned no usable milestones');
    }

    return {
      project_title: String(parsed?.project_title || buildProjectTitle(description)).trim(),
      milestones
    };
  } catch (error) {
    console.error('Gemini milestone generation failed, using fallback milestones:', error.message);
    return buildFallbackMilestones(description);
  }
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

  if (!hasUsableGeminiKey()) {
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
