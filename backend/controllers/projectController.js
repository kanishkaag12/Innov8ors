const Project = require('../models/Project');
const Proposal = require('../models/Proposal');
const Milestone = require('../models/Milestone');
const User = require('../models/User');

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDateOrDefault(value) {
  const candidate = value ? new Date(value) : null;
  if (candidate && !Number.isNaN(candidate.getTime())) {
    return candidate;
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 30);
  return fallback;
}

async function createProject(req, res) {
  try {
    if (!req.user || req.user.role !== 'employer') {
      return res.status(403).json({ message: 'Only employers can create projects.' });
    }

    const { title, description, budget, deadline, milestones } = req.body || {};

    if (!title || !description) {
      return res.status(400).json({ message: 'title and description are required.' });
    }

    const project = await Project.create({
      title: String(title).trim(),
      description: String(description).trim(),
      budget: toNumber(budget, 0),
      deadline: toDateOrDefault(deadline),
      employer_id: req.user._id
    });

    if (Array.isArray(milestones) && milestones.length > 0) {
      const docs = milestones
        .map((milestone) => ({
          project_id: project._id,
          title: String(milestone?.title || '').trim(),
          description: String(milestone?.description || '').trim(),
          deliverable: String(milestone?.deliverable || '').trim(),
          payment_amount: toNumber(milestone?.payment_amount, 0),
          estimated_time: String(milestone?.estimated_time || '').trim(),
          complexity: String(milestone?.complexity || 'Medium').trim(),
          payout_percentage: toNumber(milestone?.payout_percentage, 0),
          order: toNumber(milestone?.order, 0),
          status: 'pending'
        }))
        .filter((milestone) => milestone.title && milestone.description && milestone.deliverable);

      if (docs.length > 0) {
        const createdMilestones = await Milestone.insertMany(docs);
        project.milestones = createdMilestones.map((item) => item._id);
        await project.save();
      }
    }

    const populated = await Project.findById(project._id)
      .populate('employer_id', 'name email')
      .populate('freelancer_id', 'name email')
      .populate('milestones');

    return res.status(201).json({ project: populated });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create project.' });
  }
}

async function listProjects(req, res) {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const query = {};
    const role = String(req.user?.role || '').toLowerCase();

    if (role === 'employer' || role === 'client') {
      query.employer_id = req.user._id;
    } else if (req.query?.employerId) {
      query.employer_id = req.query.employerId;
    }

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .populate('employer_id', 'name email')
      .populate('freelancer_id', 'name email')
      .populate('milestones');

    const projectIds = projects.map((project) => String(project._id));
    const proposals = await Proposal.find({ projectId: { $in: projectIds } })
      .populate('freelancerId', 'name email pfi_score')
      .sort({ createdAt: -1 })
      .lean();

    const byProjectId = new Map();
    for (const proposal of proposals) {
      const key = String(proposal.projectId);
      if (!byProjectId.has(key)) {
        byProjectId.set(key, []);
      }
      byProjectId.get(key).push(proposal);
    }

    const enriched = projects.map((project) => {
      const proposalList = byProjectId.get(String(project._id)) || [];
      const applicants = proposalList.map((proposal) => ({
        name: proposal.freelancerName || proposal?.freelancerId?.name || 'Freelancer',
        email: proposal.freelancerEmail || proposal?.freelancerId?.email || '',
        pfiScore: toNumber(proposal?.freelancerId?.pfi_score, 0),
        requestedAt: proposal.createdAt,
        status: proposal.status || 'pending',
        proposalId: String(proposal._id),
        freelancerId: String(proposal.freelancerId?._id || proposal.freelancerId || '')
      }));

      const plain = project.toObject();
      plain.interestedCount = proposalList.length;
      plain.applicants = applicants;
      return plain;
    });

    return res.status(200).json({ projects: enriched });
  } catch (error) {
    console.error('List project error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch projects.' });
  }
}

async function getProjectById(req, res) {
  try {
    const { id } = req.params;
    const role = String(req.user?.role || '').toLowerCase();

    const project = await Project.findById(id)
      .populate('employer_id', 'name email')
      .populate('freelancer_id', 'name email')
      .populate('milestones');

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    if (
      (role === 'employer' || role === 'client') &&
      String(project.employer_id?._id || project.employer_id) !== String(req.user?._id)
    ) {
      return res.status(403).json({ message: 'You can only access your own projects.' });
    }

    const proposals = await Proposal.find({ projectId: String(project._id) })
      .populate('freelancerId', 'name email pfi_score')
      .sort({ createdAt: -1 })
      .lean();

    const applicants = proposals.map((proposal) => ({
      name: proposal.freelancerName || proposal?.freelancerId?.name || 'Freelancer',
      email: proposal.freelancerEmail || proposal?.freelancerId?.email || '',
      pfiScore: toNumber(proposal?.freelancerId?.pfi_score, 0),
      requestedAt: proposal.createdAt,
      status: proposal.status || 'pending',
      proposalId: String(proposal._id),
      freelancerId: String(proposal.freelancerId?._id || proposal.freelancerId || '')
    }));

    const plain = project.toObject();
    plain.interestedCount = proposals.length;
    plain.applicants = applicants;

    return res.status(200).json({ project: plain });
  } catch (error) {
    console.error('Get project error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch project.' });
  }
}

async function getProjectMilestones(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findById(id).populate('milestones');

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    return res.status(200).json({ milestones: project.milestones || [] });
  } catch (error) {
    console.error('Get project milestones error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch milestones.' });
  }
}

async function deleteProject(req, res) {
  try {
    const { id } = req.params;

    if (!req.user?._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const role = String(req.user?.role || '').toLowerCase();
    const isOwner = String(project.employer_id) === String(req.user._id);

    if ((role === 'employer' || role === 'client') && !isOwner) {
      return res.status(403).json({ message: 'You can only delete your own projects.' });
    }

    await Promise.all([
      Milestone.deleteMany({ project_id: project._id }),
      Proposal.deleteMany({ projectId: String(project._id) }),
      Project.deleteOne({ _id: project._id })
    ]);

    return res.status(200).json({ message: 'Project deleted successfully.' });
  } catch (error) {
    console.error('Delete project error:', error);
    return res.status(500).json({ message: error.message || 'Failed to delete project.' });
  }
}

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  getProjectMilestones,
  deleteProject
};
