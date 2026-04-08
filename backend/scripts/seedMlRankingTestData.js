const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const Project = require('../models/Project');
const User = require('../models/User');
const Proposal = require('../models/Proposal');
const FreelancerMetrics = require('../models/FreelancerMetrics');

const REQUIRED_SKILLS = ['AI/ML', 'Backend development', 'System design', 'APIs', 'Database architecture'];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    projectId: null,
    validateApi: false,
    apiBase: process.env.API_BASE_URL || 'http://localhost:5000'
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--projectId' && args[i + 1]) {
      options.projectId = args[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--validate-api') {
      options.validateApi = true;
      continue;
    }

    if (arg === '--api-base' && args[i + 1]) {
      options.apiBase = args[i + 1];
      i += 1;
    }
  }

  return options;
}

function ensureMongoUri() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI or MONGODB_URI is not defined.');
  }
  return mongoUri;
}

function pickExperienceLevel(years) {
  if (years >= 5) return 'senior';
  if (years >= 2) return 'mid';
  return 'junior';
}

function buildFreelancerBlueprints(projectBudget) {
  const budget = Number.isFinite(projectBudget) ? projectBudget : 5000;

  return [
    {
      key: 'expert',
      name: 'Aarav Menon',
      email: 'mltest.expert@seed.local',
      headline: 'Senior AI + Backend Architect',
      bio: 'I build production-ready AI platforms with robust backend architecture, secure APIs, and scalable data systems. I have delivered autonomous workflow and payment orchestration systems for fintech and SaaS products.',
      skills: ['AI/ML', 'Backend development', 'System design', 'APIs', 'Database architecture', 'Python', 'Node.js', 'MLOps'],
      yearsExperience: 7,
      rating: 4.9,
      completionRate: 96,
      onTimeRate: 94,
      responseTimeHours: 2,
      completedJobs: 52,
      profileCompleteness: 95,
      expectedRate: 95,
      proposalText: 'Your Autonomous AI Payment & Project Agent requires strong model integration, resilient API orchestration, and transactional safety. I have built similar systems that combine AI ranking, secure payout workflows, and traceable project states. I will deliver a robust service layer, strong schema design, and measurable reliability with clear milestones and observability from day one.',
      bidAmount: Math.round(budget * 0.98),
      estimatedDeliveryDays: 18
    },
    {
      key: 'mid',
      name: 'Nadia Rahman',
      email: 'mltest.mid@seed.local',
      headline: 'Backend Engineer with AI Exposure',
      bio: 'I focus on backend services and API development, and I have contributed to a few AI-assisted features. I am comfortable with service integration and iterative delivery across web products.',
      skills: ['Backend development', 'APIs', 'Database architecture', 'Node.js', 'Express', 'SQL', 'AI/ML'],
      yearsExperience: 3,
      rating: 4.3,
      completionRate: 82,
      onTimeRate: 79,
      responseTimeHours: 7,
      completedJobs: 19,
      profileCompleteness: 83,
      expectedRate: 55,
      proposalText: 'I can help build the backend and API portions of this platform and support AI-related integration tasks. I usually deliver in phases and can adapt to evolving requirements while keeping the implementation clean and maintainable.',
      bidAmount: Math.round(budget * 0.9),
      estimatedDeliveryDays: 24
    },
    {
      key: 'low',
      name: 'Jason Cruz',
      email: 'mltest.low@seed.local',
      headline: 'Generalist Web Creator',
      bio: 'I build websites and basic content platforms. My recent work has been mostly CMS customization and landing pages for small businesses.',
      skills: ['WordPress', 'UI Design', 'HTML', 'CSS', 'Content Writing'],
      yearsExperience: 1,
      rating: 3.8,
      completionRate: 61,
      onTimeRate: 58,
      responseTimeHours: 22,
      completedJobs: 7,
      profileCompleteness: 68,
      expectedRate: 30,
      proposalText: 'I can do your project quickly. I have done many website projects and can start immediately.',
      bidAmount: Math.round(budget * 0.72),
      estimatedDeliveryDays: 30
    },
    {
      key: 'outlier',
      name: 'Elena Kovacs',
      email: 'mltest.outlier@seed.local',
      headline: 'Principal AI Systems Consultant',
      bio: 'I design enterprise-grade AI and data platforms with strict reliability and governance requirements. I have extensive experience with high-scale architecture and delivery governance.',
      skills: ['AI/ML', 'Backend development', 'System design', 'APIs', 'Database architecture', 'Distributed Systems', 'Kubernetes'],
      yearsExperience: 9,
      rating: 4.8,
      completionRate: 93,
      onTimeRate: 91,
      responseTimeHours: 4,
      completedJobs: 64,
      profileCompleteness: 97,
      expectedRate: 220,
      proposalText: 'I can deliver a high-reliability implementation with robust architecture, governance, and future-proof service boundaries. My approach emphasizes long-term maintainability, risk controls, and measurable outcomes.',
      bidAmount: Math.round(budget * 1.65),
      estimatedDeliveryDays: 16
    }
  ];
}

async function upsertFreelancer(blueprint) {
  const existing = await User.findOne({ email: blueprint.email });
  const passwordHash = existing?.password || (await bcrypt.hash('password123', 10));

  const update = {
    name: blueprint.name,
    email: blueprint.email,
    password: passwordHash,
    role: 'freelancer',
    onboardingCompleted: true,
    freelancerProfile: {
      fullName: blueprint.name,
      email: blueprint.email,
      headline: blueprint.headline,
      bio: blueprint.bio,
      location: 'Remote',
      availability: '30+ hrs/week',
      skills: blueprint.skills,
      interests: ['AI automation', 'backend architecture'],
      preferredCategories: ['AI/ML', 'Backend Development'],
      primaryCategory: 'AI/ML',
      experienceLevel: pickExperienceLevel(blueprint.yearsExperience),
      yearsExperience: blueprint.yearsExperience,
      preferredBudgetMin: Math.max(100, Math.round(blueprint.bidAmount * 0.85)),
      preferredBudgetMax: Math.round(blueprint.bidAmount * 1.15),
      preferredProjectType: 'fixed',
      portfolioLinks: [`https://portfolio.example/${blueprint.key}`],
      languages: ['English'],
      embeddingText: `${blueprint.headline}. ${blueprint.bio}`,
      lastEmbeddingAt: new Date()
    }
  };

  return User.findOneAndUpdate(
    { email: blueprint.email },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function upsertMetrics(freelancerId, blueprint) {
  const performanceTotalProposals = Math.max(blueprint.completedJobs + 6, 10);
  const acceptedProposals = Math.round((performanceTotalProposals * blueprint.completionRate) / 100);

  return FreelancerMetrics.findOneAndUpdate(
    { freelancer_id: freelancerId },
    {
      $set: {
        freelancer_id: freelancerId,
        profile_completeness: {
          score: blueprint.profileCompleteness,
          last_updated: new Date()
        },
        verification_status: {
          github_verified: true,
          portfolio_verified: true,
          identity_verified: true,
          score: Math.max(70, blueprint.profileCompleteness - 5),
          last_updated: new Date()
        },
        performance_metrics: {
          total_proposals: performanceTotalProposals,
          accepted_proposals: acceptedProposals,
          proposal_acceptance_rate: Math.max(40, blueprint.completionRate - 8),
          total_milestones: blueprint.completedJobs * 2,
          completed_milestones: Math.round((blueprint.completedJobs * 2 * blueprint.completionRate) / 100),
          milestone_completion_rate: blueprint.completionRate,
          on_time_deliveries: Math.round((blueprint.completedJobs * blueprint.onTimeRate) / 100),
          total_deliveries: blueprint.completedJobs,
          on_time_delivery_rate: blueprint.onTimeRate,
          last_updated: new Date()
        },
        client_feedback: {
          total_ratings: Math.max(blueprint.completedJobs, 4),
          average_rating: blueprint.rating,
          total_reviews: Math.max(blueprint.completedJobs - 1, 3),
          positive_reviews: Math.max(Math.round(blueprint.completedJobs * 0.85), 2),
          review_sentiment_score: Math.round((blueprint.rating / 5) * 100),
          total_rehires: Math.max(Math.round(blueprint.completedJobs * 0.2), 0),
          rehire_rate: Math.max(Math.round((blueprint.rating / 5) * 85), 20),
          last_updated: new Date()
        },
        responsiveness: {
          average_response_time_hours: blueprint.responseTimeHours,
          response_rate: Math.max(45, 100 - blueprint.responseTimeHours * 2),
          score: Math.max(35, 100 - blueprint.responseTimeHours * 3),
          last_updated: new Date()
        },
        risk_metrics: {
          total_disputes: blueprint.key === 'low' ? 2 : 0,
          active_disputes: blueprint.key === 'low' ? 1 : 0,
          refunds_processed: blueprint.key === 'low' ? 1 : 0,
          failed_escrows: blueprint.key === 'low' ? 1 : 0,
          penalty_score: blueprint.key === 'low' ? 35 : 5,
          last_updated: new Date()
        }
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function upsertProposal(project, freelancer, blueprint) {
  return Proposal.findOneAndUpdate(
    {
      projectId: String(project._id),
      freelancerId: freelancer._id
    },
    {
      $set: {
        projectId: String(project._id),
        projectTitle: project.title,
        projectDescription: project.description,
        projectBudget: project.budget,
        requiredSkills: REQUIRED_SKILLS,
        employerId: project.employer_id,
        freelancerId: freelancer._id,
        freelancerEmail: freelancer.email,
        freelancerName: freelancer.name,
        proposalText: blueprint.proposalText,
        bidAmount: blueprint.bidAmount,
        expectedRate: blueprint.expectedRate,
        estimatedDeliveryDays: blueprint.estimatedDeliveryDays,
        responseTimeMinutes: Math.max(5, Math.round(blueprint.responseTimeHours * 60)),
        status: 'pending'
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function resolveProject(projectIdArg) {
  if (projectIdArg && mongoose.Types.ObjectId.isValid(projectIdArg)) {
    const byId = await Project.findById(projectIdArg);
    if (byId) return byId;
  }

  const byTitle = await Project.findOne({
    title: { $regex: /autonomous ai payment|project agent/i }
  }).sort({ createdAt: -1 });

  if (byTitle) return byTitle;

  return Project.findOne({}).sort({ createdAt: -1 });
}

async function ensureEmployer() {
  const existing = await User.findOne({ role: 'employer' }).sort({ createdAt: 1 });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash('password123', 10);
  return User.create({
    name: 'Seed Employer',
    email: 'seed.employer@local.test',
    password: passwordHash,
    role: 'employer',
    onboardingCompleted: true,
    companyName: 'SynapEscrow Labs',
    companySize: '11-50',
    website: 'https://example.com',
    employerProfile: {
      fullName: 'Seed Employer',
      email: 'seed.employer@local.test',
      companyName: 'SynapEscrow Labs',
      about: 'Test employer for ML ranking validation.',
      location: 'Remote',
      website: 'https://example.com',
      industry: 'Fintech',
      hiringInterests: ['AI/ML', 'Backend Development'],
      preferredFreelancerCategories: ['AI/ML', 'System Design'],
      companySize: '11-50',
      hiringGoals: 'Validate ML freelancer ranking quality.',
      verificationInfo: 'seed-profile'
    }
  });
}

async function ensureProject(projectIdArg) {
  const found = await resolveProject(projectIdArg);
  if (found) return found;

  const employer = await ensureEmployer();
  return Project.create({
    title: 'Autonomous AI Payment & Project Agent',
    description:
      'Build an autonomous AI-driven payment and project coordination agent with strong backend APIs, system design, and database architecture. The solution should support ranking insights, secure workflows, and scalable integrations.',
    employer_id: employer._id,
    budget: 7000,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
  });
}

async function validateRankingApi({ apiBase, projectId, seededFreelancerIds }) {
  const employer = await User.findOne({ role: 'employer' }).sort({ createdAt: 1 }).lean();
  if (!employer) {
    throw new Error('Cannot validate API: no employer user found for auth token generation.');
  }

  const secret = process.env.JWT_SECRET || 'secret123';
  const token = jwt.sign({ id: String(employer._id), role: employer.role }, secret, { expiresIn: '1h' });

  const headers = { Authorization: `Bearer ${token}` };
  const rankedUrl = `${apiBase}/api/projects/${projectId}/interested-freelancers-ranked`;
  const recomputeUrl = `${apiBase}/api/ml/recompute-ranking/${projectId}`;

  await axios.post(recomputeUrl, {}, { headers });
  const rankingRes = await axios.get(rankedUrl, { headers });
  const rankedFreelancers = rankingRes?.data?.rankedFreelancers || [];

  console.log('\n[API VALIDATION] Ranked freelancers returned:', rankedFreelancers.length);
  const rankingScores = [];
  for (const row of rankedFreelancers.slice(0, 6)) {
    const score = Number(row.model_score ?? row.ml_ranking_score ?? 0);
    rankingScores.push(score);
    console.log(`- ${row.freelancerName || row.freelancer_id}: score=${score.toFixed(4)}`);
  }

  const uniqueRoundedScores = new Set(rankingScores.map((score) => score.toFixed(6)));
  if (rankingScores.length > 1 && uniqueRoundedScores.size === 1) {
    console.warn('[API VALIDATION] Warning: all ranking scores are identical. Investigate model sensitivity or feature variance.');
  }

  for (const freelancerId of seededFreelancerIds) {
    const insightUrl = `${apiBase}/api/projects/${projectId}/freelancers/${freelancerId}/ml-insight`;
    const insightRes = await axios.get(insightUrl, { headers });
    const insight = insightRes.data || {};
    console.log(`\n[INSIGHT] freelancer=${freelancerId}`);
    console.log(`  overall_score=${Number(insight.overall_score || 0).toFixed(4)} semantic=${Number(insight.semantic_similarity_score || 0).toFixed(4)} price_fit=${Number(insight.price_fit_score || 0).toFixed(4)}`);
    console.log(`  strengths=${Array.isArray(insight.strengths) ? insight.strengths.join(' | ') : 'none'}`);
    console.log(`  risks=${Array.isArray(insight.risks) ? insight.risks.join(' | ') : 'none'}`);
  }
}

async function main() {
  const options = parseArgs();
  const mongoUri = ensureMongoUri();

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  const project = await ensureProject(options.projectId);

  const blueprints = buildFreelancerBlueprints(Number(project.budget));
  const seededFreelancerIds = [];

  console.log(`Using project: ${project.title} (${project._id})`);

  for (const blueprint of blueprints) {
    const freelancer = await upsertFreelancer(blueprint);
    await upsertMetrics(freelancer._id, blueprint);
    await upsertProposal(project, freelancer, blueprint);
    seededFreelancerIds.push(String(freelancer._id));

    console.log(`Seeded ${blueprint.key.toUpperCase()}: ${freelancer.name} (${freelancer._id})`);
  }

  console.log('\nSeed complete. Created/updated 4 freelancer profiles, proposals, and metrics.');
  console.log(`Project ID: ${project._id}`);

  if (options.validateApi) {
    await validateRankingApi({
      apiBase: options.apiBase,
      projectId: String(project._id),
      seededFreelancerIds
    });
    console.log('\nValidation complete: ranking + insights endpoint calls succeeded.');
  } else {
    console.log('Skip API validation (pass --validate-api to run endpoint checks).');
  }
}

main()
  .catch((error) => {
    console.error('\nSeed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
