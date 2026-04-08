const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const SavedJob = require('../models/SavedJob');
const JobInteraction = require('../models/JobInteraction');
const Job = require('../models/Job');
const {
  getMatches,
  listJobs,
  saveJobForFreelancer,
  unsaveJobForFreelancer,
  buildJobMatchingText
} = require('../services/jobMatchingService');
const { generateEmbedding } = require('../services/embeddingService');

const router = express.Router();

function resolveFreelancerId(req) {
  return req.user?._id?.toString() || req.query.freelancerId || req.body.freelancerId;
}

function buildFilters(source) {
  return {
    search: source.search,
    category: source.category,
    budgetMin: source.budgetMin,
    budgetMax: source.budgetMax,
    projectType: source.projectType,
    experienceLevel: source.experienceLevel,
    sortBy: source.sortBy
  };
}

router.get('/list', authenticateToken, async (req, res) => {
  try {
    const freelancerId = resolveFreelancerId(req);
    const jobs = await listJobs({
      freelancerId,
      filters: buildFilters(req.query),
      limit: req.query.limit || 20
    });

    return res.status(200).json({ jobs });
  } catch (error) {
    console.error('Job list error:', error);
    return res.status(500).json({ message: error.message || 'Failed to list jobs.' });
  }
});

router.get('/matches', authenticateToken, async (req, res) => {
  try {
    const freelancerId = resolveFreelancerId(req);
    if (!freelancerId) {
      return res.status(400).json({ message: 'freelancerId is required.' });
    }

    const matches = await getMatches({
      freelancerId,
      filters: buildFilters(req.query),
      limit: req.query.limit || 20
    });

    return res.status(200).json({ matches });
  } catch (error) {
    console.error('Job matches error:', error);
    return res.status(500).json({ message: error.message || 'Failed to rank jobs.' });
  }
});

router.post('/save', authenticateToken, async (req, res) => {
  try {
    const freelancerId = resolveFreelancerId(req);
    const { jobId } = req.body;

    if (!freelancerId || !jobId) {
      return res.status(400).json({ message: 'freelancerId and jobId are required.' });
    }

    const savedJob = await saveJobForFreelancer({ freelancerId, jobId });
    return res.status(200).json({ success: true, savedJob });
  } catch (error) {
    console.error('Save job error:', error);
    return res.status(500).json({ message: error.message || 'Failed to save job.' });
  }
});

router.delete('/save', authenticateToken, async (req, res) => {
  try {
    const freelancerId = resolveFreelancerId(req);
    const { jobId } = req.body;

    if (!freelancerId || !jobId) {
      return res.status(400).json({ message: 'freelancerId and jobId are required.' });
    }

    await unsaveJobForFreelancer({ freelancerId, jobId });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Unsave job error:', error);
    return res.status(500).json({ message: error.message || 'Failed to unsave job.' });
  }
});

router.get('/saved/:freelancerId', authenticateToken, async (req, res) => {
  try {
    const savedJobs = await SavedJob.find({ freelancerId: req.params.freelancerId })
      .populate('jobId')
      .sort({ savedAt: -1 });

    return res.status(200).json({
      savedJobs: savedJobs.map((item) => item.jobId).filter(Boolean)
    });
  } catch (error) {
    console.error('Get saved jobs error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch saved jobs.' });
  }
});

router.post('/interactions', authenticateToken, async (req, res) => {
  try {
    const freelancerId = resolveFreelancerId(req);
    const { jobId, action, metadata = {} } = req.body;

    if (!freelancerId || !jobId || !action) {
      return res.status(400).json({ message: 'freelancerId, jobId, and action are required.' });
    }

    const interaction = await JobInteraction.create({
      userId: freelancerId,
      jobId,
      action,
      metadata
    });

    return res.status(201).json({ interaction });
  } catch (error) {
    console.error('Create interaction error:', error);
    return res.status(500).json({ message: error.message || 'Failed to track interaction.' });
  }
});

router.post('/embed', async (req, res) => {
  try {
    const { text } = req.body;
    const embedding = await generateEmbedding(text);
    return res.status(200).json({ embedding });
  } catch (error) {
    console.error('Embedding error:', error);
    return res.status(500).json({ message: error.message || 'Failed to generate embedding.' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      requiredSkills = [],
      category,
      experienceLevel,
      budgetMin,
      budgetMax,
      projectType,
      location,
      employerName,
      isRemote,
      employerId
    } = req.body;

    const employer = req.user;
    const useRealEmployer = employer && employer.role === 'employer';
    const resolvedEmployerName = useRealEmployer
      ? employer.employerProfile?.fullName || employer.name
      : employerName || 'SynapEscrow Client';
    const resolvedEmployerCompanyName = useRealEmployer
      ? employer.employerProfile?.companyName || employer.companyName || ''
      : '';

    const draftJob = new Job({
      title,
      description,
      requiredSkills,
      category,
      experienceLevel,
      budgetMin: budgetMin ? Number(budgetMin) : undefined,
      budgetMax: budgetMax ? Number(budgetMax) : undefined,
      projectType,
      location: location || employer?.employerProfile?.location || 'Remote',
      employerName: resolvedEmployerName,
      employerCompanyName: resolvedEmployerCompanyName,
      employerId: useRealEmployer ? employer._id : employerId,
      isRemote: isRemote !== undefined ? isRemote : true
    });

    draftJob.matchingText = buildJobMatchingText(draftJob);
    draftJob.jobEmbedding = await generateEmbedding(draftJob.matchingText);

    await draftJob.save();
    return res.status(201).json({ job: draftJob });
  } catch (error) {
    console.error('Create job error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create job.' });
  }
});

// Compatibility aliases for the pre-existing frontend shape.
router.post('/saved', authenticateToken, async (req, res) => {
  try {
    const freelancerId = resolveFreelancerId(req);
    const { jobId } = req.body;

    if (!freelancerId || !jobId) {
      return res.status(400).json({ message: 'freelancerId and jobId are required.' });
    }

    const savedJob = await saveJobForFreelancer({ freelancerId, jobId });
    return res.status(200).json({ success: true, savedJob });
  } catch (error) {
    console.error('Save job alias error:', error);
    return res.status(500).json({ message: error.message || 'Failed to save job.' });
  }
});

router.delete('/saved', authenticateToken, async (req, res) => {
  try {
    const freelancerId = resolveFreelancerId(req);
    const { jobId } = req.body;

    if (!freelancerId || !jobId) {
      return res.status(400).json({ message: 'freelancerId and jobId are required.' });
    }

    await unsaveJobForFreelancer({ freelancerId, jobId });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Unsave job alias error:', error);
    return res.status(500).json({ message: error.message || 'Failed to unsave job.' });
  }
});

module.exports = router;
