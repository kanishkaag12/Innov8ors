const Job = require('../models/Job');
const User = require('../models/User');
const SavedJob = require('../models/SavedJob');
const JobInteraction = require('../models/JobInteraction');
const { generateEmbedding } = require('./embeddingService');

const MOCK_JOBS = [
  {
    title: 'Build a Next.js client dashboard for a fintech startup',
    description: 'Need a freelancer to build a responsive dashboard with reusable components, API integration, authentication guards, and production-ready Tailwind styling.',
    requiredSkills: ['Next.js', 'React', 'Tailwind CSS', 'REST API', 'JavaScript'],
    category: 'Web Development',
    experienceLevel: 'mid',
    budgetMin: 700,
    budgetMax: 1200,
    projectType: 'fixed',
    employerName: 'Finflow Labs',
    location: 'Remote',
    isRemote: true
  },
  {
    title: 'AI feature prototype for proposal drafting',
    description: 'Looking for a developer who can integrate LLM APIs, create prompt workflows, and ship a simple proposal drafting assistant for freelancers.',
    requiredSkills: ['Node.js', 'Prompt Engineering', 'OpenAI API', 'Express', 'JavaScript'],
    category: 'AI Development',
    experienceLevel: 'senior',
    budgetMin: 35,
    budgetMax: 55,
    projectType: 'hourly',
    employerName: 'Proposal Pilot',
    location: 'Remote',
    isRemote: true
  },
  {
    title: 'Full-stack marketplace bug fixing and polish',
    description: 'Fix dashboard issues, refine auth handling, improve message flows, and stabilize a freelancer marketplace MVP built with React and MongoDB.',
    requiredSkills: ['React', 'MongoDB', 'Express', 'Node.js', 'Debugging'],
    category: 'Web Development',
    experienceLevel: 'mid',
    budgetMin: 500,
    budgetMax: 900,
    projectType: 'fixed',
    employerName: 'MarketSprint',
    location: 'Bengaluru',
    isRemote: true
  },
  {
    title: 'Python FastAPI embedding service setup',
    description: 'Need help creating a FastAPI microservice for text embeddings using sentence-transformers and deploying it for internal matching APIs.',
    requiredSkills: ['Python', 'FastAPI', 'sentence-transformers', 'Machine Learning', 'Docker'],
    category: 'Data Science',
    experienceLevel: 'mid',
    budgetMin: 300,
    budgetMax: 650,
    projectType: 'fixed',
    employerName: 'VectorWorks',
    location: 'Remote',
    isRemote: true
  },
  {
    title: 'Mobile-friendly job search UX improvements',
    description: 'Redesign a freelancer job discovery page with filters, saved jobs, side panels, and polished responsive interactions.',
    requiredSkills: ['UI/UX', 'React', 'Tailwind CSS', 'Product Design', 'Frontend Development'],
    category: 'Design & Product',
    experienceLevel: 'junior',
    budgetMin: 20,
    budgetMax: 35,
    projectType: 'hourly',
    employerName: 'Northstar Studio',
    location: 'Remote',
    isRemote: true
  },
  {
    title: 'DevOps support for Node and MongoDB app',
    description: 'Set up deployment pipelines, environment configuration, monitoring, and production hardening for a Node/Next/Mongo stack.',
    requiredSkills: ['DevOps', 'CI/CD', 'Node.js', 'MongoDB', 'AWS'],
    category: 'DevOps',
    experienceLevel: 'senior',
    budgetMin: 900,
    budgetMax: 1800,
    projectType: 'fixed',
    employerName: 'ScaleForge',
    location: 'Remote',
    isRemote: true
  }
];

function normalizeList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
}

function normalizeSkillList(skills) {
  return normalizeList(skills);
}

function buildFreelancerMatchingText(user) {
  const profile = user?.freelancerProfile || {};
  const parts = [
    profile.headline,
    profile.bio,
    normalizeList(profile.skills).join(', '),
    normalizeList(profile.interests).join(', '),
    normalizeList(profile.preferredCategories).join(', '),
    profile.primaryCategory,
    profile.experienceLevel
  ];

  return parts.map((part) => String(part || '').trim()).filter(Boolean).join(' | ');
}

function buildJobMatchingText(job) {
  const parts = [
    job.title,
    job.description,
    normalizeList(job.requiredSkills).join(', '),
    job.category,
    job.tags?.join(', ') || '',
    job.experienceLevel,
    job.projectType
  ];

  return parts.map((part) => String(part || '').trim()).filter(Boolean).join(' | ');
}

function calculateMatchReasons(profile, job, scores) {
  const reasons = [];

  if (scores.skillsOverlap > 0) {
    reasons.push(`Strong skills match (${scores.skillsOverlap})`);
  }
  if (scores.categoryMatch > 0) {
    reasons.push(`${profile.preferredCategories?.includes(job.category) ? 'Preferred' : 'Good'} category fit: ${job.category}`);
  }
  if (scores.interestsOverlap > 0) {
    reasons.push(`${scores.interestsOverlap} interest matches`);
  }
  if (scores.projectTypeMatch) {
    reasons.push(`Preferred project type (${job.projectType})`);
  }
  if (scores.budgetFit) {
    reasons.push('Budget fits preferences');
  }

  return reasons.length ? reasons : ['Good semantic fit'];
}

function cosineSimilarity(vecA = [], vecB = []) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || !vecA.length || vecA.length !== vecB.length) {
    return 0;
  }

  const dot = vecA.reduce((sum, value, index) => sum + value * vecB[index], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, value) => sum + value * value, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, value) => sum + value * value, 0));

  if (!magnitudeA || !magnitudeB) {
    return 0;
  }

  return dot / (magnitudeA * magnitudeB);
}

async function ensureMockJobs() {
  const count = await Job.countDocuments({});
  if (count > 0) return;

  for (const mockJob of MOCK_JOBS) {
    const matchingText = buildJobMatchingText(mockJob);
    const jobEmbedding = await generateEmbedding(matchingText);

    await Job.create({
      ...mockJob,
      matchingText,
      jobEmbedding
    });
  }
}

async function ensureFreelancerEmbedding(user) {
  const matchingText = buildFreelancerMatchingText(user);
  const profile = user.freelancerProfile || {};

  if (!matchingText) {
    throw new Error('Freelancer profile is incomplete for AI matching.');
  }

  const hasUpToDateEmbedding =
    profile.embeddingText === matchingText &&
    Array.isArray(profile.profileEmbedding) &&
    profile.profileEmbedding.length > 0;

  if (hasUpToDateEmbedding) {
    return profile.profileEmbedding;
  }

  const profileEmbedding = await generateEmbedding(matchingText);
  user.freelancerProfile = {
    ...profile.toObject?.(),
    ...profile,
    embeddingText: matchingText,
    profileEmbedding,
    lastEmbeddingAt: new Date()
  };
  await user.save();

  return profileEmbedding;
}

async function ensureJobEmbedding(job) {
  const matchingText = buildJobMatchingText(job);

  if (
    job.matchingText === matchingText &&
    Array.isArray(job.jobEmbedding) &&
    job.jobEmbedding.length > 0
  ) {
    return job.jobEmbedding;
  }

  job.matchingText = matchingText;
  job.jobEmbedding = await generateEmbedding(matchingText);
  await job.save();
  return job.jobEmbedding;
}

function buildMongoFilters(filters = {}) {
  const query = {
    $and: [
      {
        $or: [{ status: 'open' }, { status: { $exists: false } }]
      }
    ]
  };

  if (filters.category) {
    query.$and.push({ category: filters.category });
  }

  if (filters.projectType) {
    query.$and.push({ projectType: filters.projectType });
  }

  if (filters.experienceLevel) {
    query.$and.push({ experienceLevel: filters.experienceLevel });
  }

  if (filters.search) {
    query.$and.push({
      $or: [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { requiredSkills: { $elemMatch: { $regex: filters.search, $options: 'i' } } },
        { category: { $regex: filters.search, $options: 'i' } }
      ]
    });
  }

  if (filters.budgetMin || filters.budgetMax) {
    if (filters.budgetMin) {
      query.$and.push({ budgetMax: { $gte: Number(filters.budgetMin) } });
    }

    if (filters.budgetMax) {
      query.$and.push({ budgetMin: { $lte: Number(filters.budgetMax) } });
    }
  }

  if (query.$and.length === 1) {
    return query.$and[0];
  }

  return query;
}

async function getSavedJobIds(freelancerId) {
  const savedJobs = await SavedJob.find({ freelancerId }).select('jobId');
  return new Set(savedJobs.map((item) => String(item.jobId)));
}

function extractCategoryAndSkills(title, description) {
  const combined = `${title} ${description}`.toLowerCase();
  
  // Categorization logic
  let category = 'Web Development';
  if (/\b(ai|artificial intelligence|llm|chatgpt|openai|gemini|claude|rag|langchain|transformer|bert|model|bot|neural|nlp)\b/.test(combined)) {
    category = 'AI Development';
  } else if (/\b(data|python|pandas|numpy|sql|postgres|database|analytics|prediction|regression|classification|clustering|xgb|xgboost|tensorflow|pytorch|ml|machine learning)\b/.test(combined)) {
    category = 'Data Science';
  } else if (/\b(design|ui|ux|figma|adobe|illustrator|photoshop|canvas|wireframe|mockup|prototype|logo|creative)\b/.test(combined)) {
    category = 'Design & Product';
  } else if (/\b(devops|ci\/cd|aws|docker|kubernetes|terraform|cloud|pipeline|deploy|ansible|jenkins|azure|gcp)\b/.test(combined)) {
    category = 'DevOps';
  }

  // Skill extraction
  const skillKeywords = [
    'React', 'Next.js', 'Tailwind', 'Node.js', 'Express', 'Python', 'FastAPI', 'MongoDB', 
    'PostgreSQL', 'Docker', 'AWS', 'Java', 'C++', 'HTML', 'CSS', 'JavaScript', 'TypeScript', 
    'GitHub', 'Git', 'XGBoost', 'Figma', 'UI/UX', 'CI/CD', 'Kubernetes', 'Redux', 'GraphQL'
  ];
  
  const requiredSkills = [];
  for (const skill of skillKeywords) {
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(combined)) {
      requiredSkills.push(skill);
    }
  }

  if (requiredSkills.length === 0) {
    if (category === 'Web Development') {
      requiredSkills.push('JavaScript', 'React', 'HTML', 'CSS');
    } else if (category === 'AI Development') {
      requiredSkills.push('Python', 'OpenAI API', 'Prompt Engineering');
    } else if (category === 'Data Science') {
      requiredSkills.push('Python', 'Machine Learning', 'Data Analysis');
    } else if (category === 'Design & Product') {
      requiredSkills.push('Figma', 'UI/UX Design', 'Wireframing');
    } else if (category === 'DevOps') {
      requiredSkills.push('Docker', 'CI/CD', 'AWS');
    } else {
      requiredSkills.push('Software Development');
    }
  }

  return { category, requiredSkills };
}

async function syncProjectsToJobs() {
  try {
    const Project = require('../models/Project');
    const User = require('../models/User');

    // Find all projects in database
    const allProjects = await Project.find({});
    for (const project of allProjects) {
      if (project.freelancer_id) {
        // Project already has a freelancer assigned, remove from Job search listing
        await Job.deleteOne({ _id: project._id });
        continue;
      }

      const existingJob = await Job.findById(project._id);
      if (!existingJob) {
        console.log(`🔄 Syncing Project "${project.title}" (${project._id}) to Jobs collection...`);
        const employer = await User.findById(project.employer_id);
        const employerName = employer ? (employer.employerProfile?.fullName || employer.name) : 'SynapEscrow Client';
        const employerCompanyName = employer ? (employer.employerProfile?.companyName || '') : '';
        const location = employer ? (employer.employerProfile?.location || 'Remote') : 'Remote';

        const { category, requiredSkills } = extractCategoryAndSkills(project.title, project.description);

        const newJob = new Job({
          _id: project._id,
          title: project.title,
          description: project.description,
          requiredSkills,
          category,
          experienceLevel: 'mid',
          budgetMin: project.budget,
          budgetMax: project.budget,
          projectType: 'fixed',
          location,
          employerName,
          employerCompanyName,
          isRemote: true,
          status: 'open',
          createdAt: project.createdAt
        });

        newJob.matchingText = buildJobMatchingText(newJob);
        try {
          newJob.jobEmbedding = await generateEmbedding(newJob.matchingText);
        } catch (embErr) {
          console.error(`Failed to generate embedding for synced project ${project._id}:`, embErr.message);
        }

        await newJob.save();
        console.log(`✅ Synced Project "${project.title}" successfully.`);
      } else {
        // Update basic attributes if project was modified
        let needsSave = false;
        if (existingJob.status !== 'open') {
          existingJob.status = 'open';
          needsSave = true;
        }
        if (existingJob.budgetMin !== project.budget) {
          existingJob.budgetMin = project.budget;
          existingJob.budgetMax = project.budget;
          needsSave = true;
        }
        if (needsSave) {
          await existingJob.save();
        }
      }
    }
  } catch (error) {
    console.error('Error in syncProjectsToJobs:', error);
  }
}

async function listJobs({ freelancerId, filters = {}, limit = 20 }) {
  await ensureMockJobs();
  await syncProjectsToJobs();

  const query = buildMongoFilters(filters);
  const jobs = await Job.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit) || 20);

  const savedIds = freelancerId ? await getSavedJobIds(freelancerId) : new Set();

  return jobs.map((job) => ({
    ...job.toObject(),
    saved: savedIds.has(String(job._id)),
    matchScore: null,
    overlappingSkills: []
  }));
}

async function getMatches({ freelancerId, filters = {}, limit = 20 }) {
  await ensureMockJobs();
  await syncProjectsToJobs();

  const user = await User.findById(freelancerId);
  if (!user || user.role !== 'freelancer') {
    throw new Error('Freelancer not found.');
  }

  const profileEmbedding = await ensureFreelancerEmbedding(user);
  const jobs = await Job.find(buildMongoFilters(filters));
  const savedIds = await getSavedJobIds(freelancerId);
  const freelancerSkills = normalizeSkillList(user.freelancerProfile?.skills);

  const ranked = [];
  for (const job of jobs) {
    const jobEmbedding = await ensureJobEmbedding(job);
    
    // Enhanced scoring
    const freelancerSkills = normalizeList(user.freelancerProfile.skills);
    const freelancerInterests = normalizeList(user.freelancerProfile.interests);
    const freelancerCats = normalizeList(user.freelancerProfile.preferredCategories);
    
    const jobSkills = normalizeList(job.requiredSkills);
    const overlapCount = jobSkills.filter(skill => freelancerSkills.includes(skill)).length;
    
    const interestsOverlap = jobSkills.filter(skill => freelancerInterests.includes(skill)).length;
    const catMatch = freelancerCats.includes(job.category.toLowerCase()) ? 1 : 0;
    const typeMatch = user.freelancerProfile.preferredProjectType === job.projectType;
    const budgetFit = (job.budgetMin >= (user.freelancerProfile.preferredBudgetMin || 0)) &&
                      (job.budgetMax <= (user.freelancerProfile.preferredBudgetMax || Infinity));
    
    const embeddingSim = cosineSimilarity(profileEmbedding, jobEmbedding);
    
    // Weighted total score (embedding 60%, skills 15%, cat/interests 15%, type/budget 10%)
    const ruleScore = (
      (overlapCount / Math.max(jobSkills.length, 1)) * 0.4 +
      (catMatch * 0.3) +
      (interestsOverlap / Math.max(jobSkills.length, 1)) * 0.2 +
      (typeMatch ? 0.05 : 0) +
      (budgetFit ? 0.05 : 0)
    ) * 40; // Max 40% from rules
    
    const totalScore = Math.min(100, Math.max(0, Math.round(embeddingSim * 60 + ruleScore)));
    
    const scores = {
      skillsOverlap: overlapCount,
      interestsOverlap,
      categoryMatch: catMatch,
      projectTypeMatch: typeMatch,
      budgetFit
    };
    
    const matchReasons = calculateMatchReasons(user.freelancerProfile, job, scores);
    
    const overlappingSkills = jobSkills.filter(skill => freelancerSkills.includes(skill));
    const missingSkills = jobSkills.filter(skill => !freelancerSkills.includes(skill));

    ranked.push({
      ...job.toObject(),
      saved: savedIds.has(String(job._id)),
      overlappingSkills,
      missingSkills,
      matchScore: totalScore,
      matchReasons
    });
  }

  ranked.sort((left, right) => {
    if (filters.sortBy === 'latest') {
      return new Date(right.createdAt) - new Date(left.createdAt);
    }

    if (right.matchScore !== left.matchScore) {
      return right.matchScore - left.matchScore;
    }

    return new Date(right.createdAt) - new Date(left.createdAt);
  });

  return ranked.slice(0, Number(limit) || 20);
}

async function saveJobForFreelancer({ freelancerId, jobId }) {
  const savedJob = await SavedJob.findOneAndUpdate(
    { freelancerId, jobId },
    { freelancerId, jobId, savedAt: new Date(), source: 'find-work' },
    { upsert: true, new: true }
  );

  await JobInteraction.create({
    userId: freelancerId,
    jobId,
    action: 'save',
    metadata: { source: 'find-work' }
  });

  return savedJob;
}

async function unsaveJobForFreelancer({ freelancerId, jobId }) {
  await SavedJob.findOneAndDelete({ freelancerId, jobId });

  await JobInteraction.create({
    userId: freelancerId,
    jobId,
    action: 'unsave',
    metadata: { source: 'find-work' }
  });
}

module.exports = {
  buildFreelancerMatchingText,
  buildJobMatchingText,
  cosineSimilarity,
  ensureMockJobs,
  getMatches,
  listJobs,
  saveJobForFreelancer,
  unsaveJobForFreelancer
};
