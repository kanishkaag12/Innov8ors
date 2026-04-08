const Project = require('../models/Project');
const Proposal = require('../models/Proposal');
const User = require('../models/User');
const FreelancerMetrics = require('../models/FreelancerMetrics');
const MlRankingPrediction = require('../models/MlRankingPrediction');
const { generateEmbedding } = require('./embeddingService');
const { runModelPrediction } = require('./mlModelService');

const CORE_FEATURES = [
  'semantic_similarity_job_proposal',
  'semantic_similarity_job_freelancer_bio',
  'semantic_similarity_title_match',
  'skill_overlap_count',
  'skill_overlap_percentage',
  'required_skills_covered',
  'price_fit_score',
  'profile_completeness',
  'years_experience',
  'average_rating',
  'acceptance_rate',
  'completion_rate',
  'on_time_rate',
  'rehire_rate',
  'proposal_length'
];

const embeddingCache = new Map();

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function getEmbedding(text) {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return Array.from({ length: 384 }, () => 0);
  }

  if (embeddingCache.has(normalized)) {
    return embeddingCache.get(normalized);
  }

  const embedding = await generateEmbedding(normalized);
  embeddingCache.set(normalized, embedding);
  return embedding;
}

function cosineSimilarityToUnit(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0.5;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const va = safeNumber(a[i]);
    const vb = safeNumber(b[i]);
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denom) {
    return 0.5;
  }

  const cosine = dot / denom;
  return clamp(cosine * 0.5 + 0.5, 0, 1);
}

function normalizeSkillSet(skills) {
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills
    .map((skill) => String(skill || '').trim().toLowerCase())
    .filter(Boolean);
}

function inferYearsExperience(profile) {
  const directYears = safeNumber(profile?.yearsExperience, NaN);
  if (Number.isFinite(directYears)) {
    return clamp(directYears, 0, 50);
  }

  const level = String(profile?.experienceLevel || '').toLowerCase();
  if (level === 'senior') return 8;
  if (level === 'mid') return 4;
  if (level === 'junior') return 1;
  return 0;
}

function computeProfileCompleteness(profile) {
  const checks = [
    profile?.fullName,
    profile?.headline,
    profile?.bio,
    profile?.location,
    Array.isArray(profile?.skills) && profile.skills.length > 0,
    profile?.primaryCategory,
    profile?.experienceLevel,
    Array.isArray(profile?.portfolioLinks) && profile.portfolioLinks.length > 0
  ];

  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

function computePriceFit(bidAmount, budgetMin, budgetMax) {
  const bid = safeNumber(bidAmount, NaN);
  const min = safeNumber(budgetMin, NaN);
  const max = safeNumber(budgetMax, NaN);

  if (!Number.isFinite(bid) || !Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
    return 0.5;
  }

  if (min <= bid && bid <= max) {
    return 0.9;
  }

  if (bid < min * 0.8) {
    return clamp(0.5 + (bid / (min * 0.8)) * 0.4, 0, 1);
  }

  if (bid > max * 1.2) {
    return clamp(0.9 - ((bid - max) / (max * 0.2)) * 0.4, 0, 1);
  }

  return 0.8;
}

function computeMetricsProjection(metricsDoc) {
  const performance = metricsDoc?.performance_metrics || {};
  const feedback = metricsDoc?.client_feedback || {};

  return {
    average_rating: safeNumber(feedback.average_rating, 0),
    acceptance_rate: safeNumber(performance.proposal_acceptance_rate, 0),
    completion_rate: safeNumber(performance.milestone_completion_rate, 0),
    on_time_rate: safeNumber(performance.on_time_delivery_rate, 0),
    rehire_rate: safeNumber(feedback.rehire_rate, 0)
  };
}

function buildInsights(features, score) {
  const strengths = [];
  const risks = [];

  if (features.semantic_similarity_job_proposal >= 0.7) strengths.push('High semantic match with job description');
  if (features.semantic_similarity_title_match >= 0.7) strengths.push('Strong title/domain alignment');
  if (features.skill_overlap_percentage >= 60) strengths.push('Strong required skill coverage');
  if (features.price_fit_score >= 0.85) strengths.push('Competitive pricing fit');
  if (features.completion_rate >= 80) strengths.push('Reliable milestone completion history');

  if (features.semantic_similarity_job_proposal < 0.45) risks.push('Lower proposal relevance to project description');
  if (features.skill_overlap_percentage < 30) risks.push('Limited overlap with required skills');
  if (features.price_fit_score < 0.55) risks.push('Pricing appears less aligned with budget');
  if (features.completion_rate < 60) risks.push('Lower completion reliability signal');
  if (features.average_rating > 0 && features.average_rating < 3.5) risks.push('Client rating history is below preferred range');

  const proposalQualityScore = clamp(
    (features.semantic_similarity_job_proposal * 0.7 + clamp(features.proposal_length / 1200, 0, 1) * 0.3),
    0,
    1
  );

  const reliabilityScore = clamp(
    (clamp(features.completion_rate / 100, 0, 1) * 0.5 + clamp(features.on_time_rate / 100, 0, 1) * 0.3 + clamp(features.average_rating / 5, 0, 1) * 0.2),
    0,
    1
  );

  const predictedSuccessProbability = clamp((score + 1) / 2, 0, 1);

  return {
    strengths: strengths.slice(0, 4),
    risks: risks.slice(0, 4),
    proposalQualityScore,
    reliabilityScore,
    predictedSuccessProbability
  };
}

async function resolveProjectContext(projectId) {
  const project = await Project.findById(projectId).lean().catch(() => null);

  if (project) {
    return {
      projectId: String(project._id),
      title: project.title || 'Untitled Project',
      description: project.description || project.title || '',
      budget: safeNumber(project.budget, 0),
      budgetMin: safeNumber(project.budget, 0),
      budgetMax: safeNumber(project.budget, 0),
      requiredSkills: []
    };
  }

  const latestProposal = await Proposal.findOne({ projectId }).sort({ createdAt: -1 }).lean();
  if (!latestProposal) {
    return null;
  }

  return {
    projectId: String(projectId),
    title: latestProposal.projectTitle || 'Untitled Project',
    description: latestProposal.projectDescription || latestProposal.projectTitle || '',
    budget: safeNumber(latestProposal.projectBudget, 0),
    budgetMin: safeNumber(latestProposal.projectBudget, 0),
    budgetMax: safeNumber(latestProposal.projectBudget, 0),
    requiredSkills: Array.isArray(latestProposal.requiredSkills) ? latestProposal.requiredSkills : []
  };
}

async function buildFeatureRows(projectId) {
  const project = await resolveProjectContext(projectId);
  if (!project) {
    return { project: null, rows: [] };
  }

  const proposals = await Proposal.find({
    projectId: String(projectId),
    status: { $ne: 'rejected' }
  })
    .populate('freelancerId')
    .lean();

  if (!proposals.length) {
    return { project, rows: [] };
  }

  const freelancerIds = proposals
    .map((proposal) => proposal?.freelancerId?._id)
    .filter(Boolean);

  const metrics = await FreelancerMetrics.find({ freelancer_id: { $in: freelancerIds } }).lean();
  const metricsByFreelancer = new Map(metrics.map((item) => [String(item.freelancer_id), item]));

  const projectEmbedding = await getEmbedding(project.description || project.title);
  const projectTitleEmbedding = await getEmbedding(project.title || '');
  const requiredSkillSet = normalizeSkillSet(project.requiredSkills);

  const rows = [];

  for (const proposal of proposals) {
    const freelancer = proposal.freelancerId;
    if (!freelancer) {
      continue;
    }

    const profile = freelancer.freelancerProfile || {};
    const freelancerId = String(freelancer._id);
    const proposalText = String(proposal.proposalText || '').trim() || `${freelancer.name || 'Freelancer'} is interested in this project.`;
    const freelancerBio = String(profile.bio || '').trim();
    const freelancerTitle = String(profile.headline || '').trim();

    const proposalEmbedding = await getEmbedding(proposalText);
    const bioEmbedding = await getEmbedding(freelancerBio);
    const titleEmbedding = await getEmbedding(freelancerTitle);

    const freelancerSkillSet = normalizeSkillSet(profile.skills);
    const matchedSkills = requiredSkillSet.length
      ? requiredSkillSet.filter((skill) => freelancerSkillSet.includes(skill)).length
      : 0;

    const metricsProjection = computeMetricsProjection(metricsByFreelancer.get(freelancerId));
    const bidAmount = safeNumber(proposal.bidAmount, safeNumber(profile.preferredBudgetMin, project.budget || 0));
    const expectedRate = safeNumber(proposal.expectedRate, safeNumber(profile.preferredBudgetMin, 0));
    const estimatedDeliveryDays = safeNumber(proposal.estimatedDeliveryDays, 0);
    const responseTimeHours = safeNumber(proposal.responseTimeMinutes, 24 * 60) / 60;

    const features = {
      semantic_similarity_job_proposal: cosineSimilarityToUnit(projectEmbedding, proposalEmbedding),
      semantic_similarity_job_freelancer_bio: cosineSimilarityToUnit(projectEmbedding, bioEmbedding),
      semantic_similarity_title_match: cosineSimilarityToUnit(projectTitleEmbedding, titleEmbedding),
      skill_overlap_count: matchedSkills,
      skill_overlap_percentage: requiredSkillSet.length ? (matchedSkills / requiredSkillSet.length) * 100 : 0,
      required_skills_covered: matchedSkills,
      price_fit_score: computePriceFit(bidAmount, project.budgetMin, project.budgetMax),
      profile_completeness: computeProfileCompleteness(profile),
      years_experience: inferYearsExperience(profile),
      average_rating: metricsProjection.average_rating,
      acceptance_rate: metricsProjection.acceptance_rate,
      completion_rate: metricsProjection.completion_rate,
      on_time_rate: metricsProjection.on_time_rate,
      rehire_rate: metricsProjection.rehire_rate,
      proposal_length: proposalText.length,
      bid_amount: bidAmount,
      expected_rate: expectedRate,
      estimated_delivery_days: estimatedDeliveryDays,
      response_time_hours: responseTimeHours,
      skill_overlap_score: requiredSkillSet.length ? matchedSkills / requiredSkillSet.length : 0
    };

    features.semantic_similarity_score = features.semantic_similarity_job_proposal;

    const row = { project, proposal, freelancer, features };
    for (const featureName of CORE_FEATURES) {
      row[featureName] = features[featureName];
    }

    rows.push(row);
  }

  return { project, rows };
}

async function buildSingleFeatureRow(projectId, freelancerId) {
  const project = await resolveProjectContext(projectId);
  if (!project) {
    return { project: null, row: null };
  }

  const proposal = await Proposal.findOne({
    projectId: String(projectId),
    freelancerId,
    status: { $ne: 'rejected' }
  })
    .populate('freelancerId')
    .lean();

  if (!proposal?.freelancerId) {
    return { project, row: null };
  }

  const freelancer = proposal.freelancerId;
  const profile = freelancer.freelancerProfile || {};

  const metricsDoc = await FreelancerMetrics.findOne({ freelancer_id: freelancer._id }).lean();
  const metricsProjection = computeMetricsProjection(metricsDoc);

  const projectEmbedding = await getEmbedding(project.description || project.title);
  const projectTitleEmbedding = await getEmbedding(project.title || '');

  const proposalText = String(proposal.proposalText || '').trim() || `${freelancer.name || 'Freelancer'} is interested in this project.`;
  const freelancerBio = String(profile.bio || '').trim();
  const freelancerTitle = String(profile.headline || '').trim();

  const proposalEmbedding = await getEmbedding(proposalText);
  const bioEmbedding = await getEmbedding(freelancerBio);
  const titleEmbedding = await getEmbedding(freelancerTitle);

  const requiredSkillSet = normalizeSkillSet(project.requiredSkills);
  const freelancerSkillSet = normalizeSkillSet(profile.skills);
  const matchedSkills = requiredSkillSet.length
    ? requiredSkillSet.filter((skill) => freelancerSkillSet.includes(skill)).length
    : 0;

  const bidAmount = safeNumber(proposal.bidAmount, safeNumber(profile.preferredBudgetMin, project.budget || 0));
  const expectedRate = safeNumber(proposal.expectedRate, safeNumber(profile.preferredBudgetMin, 0));
  const estimatedDeliveryDays = safeNumber(proposal.estimatedDeliveryDays, 0);
  const responseTimeHours = safeNumber(proposal.responseTimeMinutes, 24 * 60) / 60;

  const features = {
    semantic_similarity_job_proposal: cosineSimilarityToUnit(projectEmbedding, proposalEmbedding),
    semantic_similarity_job_freelancer_bio: cosineSimilarityToUnit(projectEmbedding, bioEmbedding),
    semantic_similarity_title_match: cosineSimilarityToUnit(projectTitleEmbedding, titleEmbedding),
    skill_overlap_count: matchedSkills,
    skill_overlap_percentage: requiredSkillSet.length ? (matchedSkills / requiredSkillSet.length) * 100 : 0,
    required_skills_covered: matchedSkills,
    price_fit_score: computePriceFit(bidAmount, project.budgetMin, project.budgetMax),
    profile_completeness: computeProfileCompleteness(profile),
    years_experience: inferYearsExperience(profile),
    average_rating: metricsProjection.average_rating,
    acceptance_rate: metricsProjection.acceptance_rate,
    completion_rate: metricsProjection.completion_rate,
    on_time_rate: metricsProjection.on_time_rate,
    rehire_rate: metricsProjection.rehire_rate,
    proposal_length: proposalText.length,
    bid_amount: bidAmount,
    expected_rate: expectedRate,
    estimated_delivery_days: estimatedDeliveryDays,
    response_time_hours: responseTimeHours,
    skill_overlap_score: requiredSkillSet.length ? matchedSkills / requiredSkillSet.length : 0
  };

  features.semantic_similarity_score = features.semantic_similarity_job_proposal;

  const row = { project, proposal, freelancer, features };
  for (const featureName of CORE_FEATURES) {
    row[featureName] = features[featureName];
  }

  return { project, row };
}

async function rankProjectFreelancers(projectId, { forceRecompute = false } = {}) {
  const normalizedProjectId = String(projectId);

  if (!forceRecompute) {
    const cached = await MlRankingPrediction.find({ projectId: normalizedProjectId })
      .populate('freelancerId')
      .sort({ rank: 1 })
      .lean();

    if (cached.length) {
      return {
        projectId: normalizedProjectId,
        modelVersion: cached[0]?.modelVersion || 'freelancer_ranker_v1',
        rankedFreelancers: cached.map((entry) => ({
          freelancer_id: String(entry.freelancerId?._id || entry.freelancerId),
          rank: entry.rank,
          rank_position: entry.rank,
          model_score: entry.mlScore,
          ml_ranking_score: entry.mlScore,
          percentile_rank: entry.percentileRank,
          top_strengths: entry.strengths || [],
          top_risks: entry.risks || [],
          short_explanation: entry.shortExplanation,
          semantic_score_contribution: entry.semanticSimilarityScore,
          proposal_quality_score: entry.proposalQualityScore,
          price_fit_contribution: entry.priceFitScore,
          metrics_contribution: entry.reliabilityScore,
          estimated_success_probability: entry.predictedSuccessProbability,
          freelancerProfile: {
            name: entry.freelancerId?.name || 'Freelancer',
            title: entry.freelancerId?.freelancerProfile?.headline || 'Freelancer'
          }
        }))
      };
    }
  }

  const { project, rows } = await buildFeatureRows(normalizedProjectId);
  if (!project) {
    const error = new Error('Project not found for ranking.');
    error.status = 404;
    throw error;
  }

  if (!rows.length) {
    return {
      projectId: normalizedProjectId,
      modelVersion: 'freelancer_ranker_v1',
      rankedFreelancers: []
    };
  }

  const predictorResponse = await runModelPrediction(rows.map((row) => {
    const payload = {};
    for (const featureName of CORE_FEATURES) {
      payload[featureName] = row[featureName];
    }
    return payload;
  }));

  const scores = Array.isArray(predictorResponse?.scores) ? predictorResponse.scores : [];
  const modelVersion = `freelancer_ranker_v1_xgb_${predictorResponse?.xgboostVersion || 'unknown'}`;

  const scored = rows.map((row, index) => ({
    ...row,
    mlScore: safeNumber(scores[index], 0)
  }));

  scored.sort((a, b) => b.mlScore - a.mlScore);

  const docsToWrite = [];
  const rankedFreelancers = scored.map((entry, index) => {
    const rank = index + 1;
    const percentileRank = clamp((1 - index / Math.max(scored.length, 1)) * 100, 0, 100);
    const insight = buildInsights(entry.features, entry.mlScore);

    const shortExplanation = insight.strengths[0]
      || (insight.risks[0] ? `Caution: ${insight.risks[0]}` : 'Model prediction based on learned ranking patterns');

    docsToWrite.push({
      updateOne: {
        filter: {
          projectId: normalizedProjectId,
          freelancerId: entry.freelancer._id
        },
        update: {
          $set: {
            modelVersion,
            mlScore: entry.mlScore,
            rank,
            percentileRank,
            semanticSimilarityScore: entry.features.semantic_similarity_job_proposal,
            proposalQualityScore: insight.proposalQualityScore,
            priceFitScore: entry.features.price_fit_score,
            reliabilityScore: insight.reliabilityScore,
            predictedSuccessProbability: insight.predictedSuccessProbability,
            features: entry.features,
            strengths: insight.strengths,
            risks: insight.risks,
            shortExplanation,
            computedAt: new Date()
          }
        },
        upsert: true
      }
    });

    return {
      freelancer_id: String(entry.freelancer._id),
      rank,
      rank_position: rank,
      model_score: entry.mlScore,
      ml_ranking_score: entry.mlScore,
      percentile_rank: percentileRank,
      top_strengths: insight.strengths,
      top_risks: insight.risks,
      short_explanation: shortExplanation,
      semantic_score_contribution: entry.features.semantic_similarity_job_proposal,
      proposal_quality_score: insight.proposalQualityScore,
      price_fit_contribution: entry.features.price_fit_score,
      metrics_contribution: insight.reliabilityScore,
      estimated_success_probability: insight.predictedSuccessProbability,
      freelancerProfile: {
        name: entry.freelancer?.name || 'Freelancer',
        title: entry.freelancer?.freelancerProfile?.headline || 'Freelancer'
      }
    };
  });

  if (docsToWrite.length) {
    await MlRankingPrediction.bulkWrite(docsToWrite);
  }

  return {
    projectId: normalizedProjectId,
    modelVersion,
    rankedFreelancers
  };
}

async function getFreelancerInsight(projectId, freelancerId) {
  const { project, row } = await buildSingleFeatureRow(projectId, freelancerId);

  if (!project || !row) {
    const error = new Error('Freelancer insight not found for this project.');
    error.status = 404;
    throw error;
  }

  const predictorResponse = await runModelPrediction([
    CORE_FEATURES.reduce((acc, featureName) => {
      acc[featureName] = row[featureName];
      return acc;
    }, {})
  ]);

  const score = safeNumber(Array.isArray(predictorResponse?.scores) ? predictorResponse.scores[0] : 0, 0);
  const modelVersion = `freelancer_ranker_v1_xgb_${predictorResponse?.xgboostVersion || 'unknown'}`;
  const insight = buildInsights(row.features, score);

  const existing = await MlRankingPrediction.find({ projectId: String(projectId) })
    .sort({ mlScore: -1 })
    .lean();
  const rankPosition = (existing.findIndex((entry) => String(entry.freelancerId) === String(freelancerId)) + 1) || 1;

  const shortExplanation = insight.strengths[0]
    || (insight.risks[0] ? `Caution: ${insight.risks[0]}` : 'Model prediction based on learned ranking patterns');

  await MlRankingPrediction.updateOne(
    {
      projectId: String(projectId),
      freelancerId
    },
    {
      $set: {
        modelVersion,
        mlScore: score,
        rank: rankPosition,
        percentileRank: 0,
        semanticSimilarityScore: row.features.semantic_similarity_job_proposal,
        proposalQualityScore: insight.proposalQualityScore,
        priceFitScore: row.features.price_fit_score,
        reliabilityScore: insight.reliabilityScore,
        predictedSuccessProbability: insight.predictedSuccessProbability,
        features: row.features,
        strengths: insight.strengths,
        risks: insight.risks,
        shortExplanation,
        computedAt: new Date()
      }
    },
    { upsert: true }
  );

  return {
    freelancer_id: String(freelancerId),
    overall_score: score,
    semantic_similarity_score: row.features.semantic_similarity_job_proposal,
    proposal_quality_score: insight.proposalQualityScore,
    price_fit_score: row.features.price_fit_score,
    reliability_score: insight.reliabilityScore,
    predicted_success_probability: insight.predictedSuccessProbability,
    strengths: insight.strengths,
    risks: insight.risks
  };
}

module.exports = {
  CORE_FEATURES,
  rankProjectFreelancers,
  getFreelancerInsight
};
