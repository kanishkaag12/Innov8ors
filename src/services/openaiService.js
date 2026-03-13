const OpenAI = require('openai');

let client = null;

const getClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing. Configure it in your environment before calling AI endpoints.');
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return client;
};

const extractJson = (text) => {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('Invalid AI JSON response format');
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
};

const generateMilestonesFromDescription = async ({ title, description, budget, deadline }) => {
  const openai = getClient();
  const prompt = `You are a senior technical project planner. Generate practical, measurable milestones for this freelance project.\n\nProject title: ${title}\nDescription: ${description}\nBudget: ${budget}\nDeadline: ${deadline}\n\nRules:\n1) Return 3-8 milestones\n2) Milestone payment_amount values must sum exactly to ${budget}\n3) Each milestone must have: title, description, deliverable, timeline, payment_amount\n4) Keep titles concise and deliverables verifiable\n5) Output valid JSON only in this exact shape:\n{\n  "milestones": [\n    {\n      "title": "...",\n      "description": "...",\n      "deliverable": "...",\n      "timeline": "...",\n      "payment_amount": 0\n    }\n  ]\n}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      { role: 'system', content: 'You produce strict JSON only.' },
      { role: 'user', content: prompt }
    ]
  });

  const content = response.choices?.[0]?.message?.content || '{}';
  const parsed = extractJson(content);

  if (!Array.isArray(parsed.milestones) || parsed.milestones.length === 0) {
    throw new Error('AI milestone generation failed');
  }

  return parsed.milestones.map((milestone) => ({
    ...milestone,
    timeline: milestone.timeline || milestone.estimated_time || '1 week',
    estimated_time: milestone.estimated_time || milestone.timeline || '1 week'
  }));
};

const verifyMilestoneSubmissionWithAI = async ({ milestone, submission }) => {
  const openai = getClient();
  const prompt = `You are an objective quality verifier for freelancer deliverables.\n\nMilestone requirement:\nTitle: ${milestone.title}\nDescription: ${milestone.description}\nDeliverable: ${milestone.deliverable}\nEstimated Time: ${milestone.estimated_time}\n\nSubmission:\nText: ${submission.text || 'N/A'}\nGitHub Link: ${submission.github_link || 'N/A'}\nFile URL: ${submission.file_url || 'N/A'}\n\nEvaluate completion against requirement.\nReturn strict JSON only in this exact structure:\n{\n  "status": "completed|partial|not_completed",\n  "feedback": "clear concise explanation",\n  "quality_score": 0\n}\n\nquality_score must be an integer between 0 and 100.`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          'You are a strict evaluator. Output JSON only. status must be one of completed, partial, not_completed.'
      },
      { role: 'user', content: prompt }
    ]
  });

  const content = response.choices?.[0]?.message?.content || '{}';
  const parsed = extractJson(content);

  if (!['completed', 'partial', 'not_completed'].includes(parsed.status)) {
    throw new Error('Invalid verification status from AI');
  }

  const qualityScore = Number.isFinite(parsed.quality_score)
    ? Math.max(0, Math.min(100, Math.round(parsed.quality_score)))
    : parsed.status === 'completed'
      ? 90
      : parsed.status === 'partial'
        ? 60
        : 20;

  return {
    status: parsed.status,
    feedback: parsed.feedback || 'No feedback provided by AI.',
    quality_score: qualityScore
  };
};

module.exports = {
  generateMilestonesFromDescription,
  verifyMilestoneSubmissionWithAI
};
