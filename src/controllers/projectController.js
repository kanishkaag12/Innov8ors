const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Payment = require('../models/Payment');
const { generateMilestonesFromDescription } = require('../services/openaiService');
const { recomputeProjectEscrow } = require('../services/escrowService');

const createProject = async (req, res) => {
  const { employer_id, freelancer_id, title, description, budget, deadline } = req.body;

  if (!employer_id || !title || !description || budget === undefined || !deadline) {
    return res.status(400).json({
      message: 'employer_id, title, description, budget, and deadline are required'
    });
  }

  const project = await Project.create({
    employer_id,
    freelancer_id: freelancer_id || null,
    title,
    description,
    budget,
    deadline
  });

  return res.status(201).json({
    message: 'Project created successfully',
    project
  });
};

const getProjectById = async (req, res) => {
  const { id } = req.params;

  const project = await Project.findById(id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  return res.status(200).json({ project });
};

const listProjects = async (req, res) => {
  const { role, user_id } = req.query;

  const query = {};
  if (role === 'employer' && user_id) {
    query.employer_id = user_id;
  }

  if (role === 'freelancer') {
    query.status = { $in: ['active', 'in_progress'] };
    if (user_id) {
      query.$or = [{ freelancer_id: user_id }, { freelancer_id: null }];
    }
  }

  const projects = await Project.find(query).sort({ createdAt: -1 });

  return res.status(200).json({ projects });
};

const getProjectMilestones = async (req, res) => {
  const { id } = req.params;

  const project = await Project.findById(id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const milestones = await Milestone.find({ project_id: id }).sort({ createdAt: 1 });

  return res.status(200).json({
    project_id: id,
    milestones
  });
};

const approveMilestones = async (req, res) => {
  const { id } = req.params;
  const { action, milestones } = req.body;

  const project = await Project.findById(id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!['approve', 'edit', 'regenerate'].includes(action)) {
    return res.status(400).json({ message: 'action must be approve, edit, or regenerate' });
  }

  if (action === 'edit') {
    if (!Array.isArray(milestones) || milestones.length === 0) {
      return res.status(400).json({ message: 'Provide milestones array for edit action' });
    }

    const updates = [];
    for (const milestoneUpdate of milestones) {
      if (!milestoneUpdate.id) {
        continue;
      }

      const updated = await Milestone.findOneAndUpdate(
        { _id: milestoneUpdate.id, project_id: id },
        {
          ...(milestoneUpdate.title ? { title: milestoneUpdate.title } : {}),
          ...(milestoneUpdate.description ? { description: milestoneUpdate.description } : {}),
          ...(milestoneUpdate.deliverable ? { deliverable: milestoneUpdate.deliverable } : {}),
          ...(milestoneUpdate.timeline ? { timeline: milestoneUpdate.timeline, estimated_time: milestoneUpdate.timeline } : {}),
          ...(milestoneUpdate.payment_amount !== undefined
            ? { payment_amount: Number(milestoneUpdate.payment_amount) }
            : {}),
          approval_status: 'edited'
        },
        { new: true }
      );

      if (updated) {
        updates.push(updated);
      }
    }

    return res.status(200).json({
      message: 'Milestones updated successfully',
      milestones: updates
    });
  }

  if (action === 'regenerate') {
    if (project.escrow_status !== 'unfunded') {
      return res.status(400).json({
        message: 'Cannot regenerate milestones after escrow is funded'
      });
    }

    await Milestone.deleteMany({ project_id: id });
    await Payment.deleteMany({ project_id: id });

    const regenerated = await generateMilestonesFromDescription({
      title: project.title,
      description: project.description,
      budget: project.budget,
      deadline: project.deadline
    });

    const savedMilestones = await Milestone.insertMany(
      regenerated.map((milestone) => ({
        project_id: project._id,
        freelancer_id: project.freelancer_id,
        title: milestone.title,
        description: milestone.description,
        deliverable: milestone.deliverable,
        estimated_time: milestone.timeline || milestone.estimated_time,
        timeline: milestone.timeline || milestone.estimated_time,
        payment_amount: milestone.payment_amount,
        approval_status: 'pending'
      }))
    );

    return res.status(200).json({
      message: 'Milestones regenerated successfully',
      milestones: savedMilestones
    });
  }

  const existingMilestones = await Milestone.find({ project_id: id }).sort({ createdAt: 1 });
  if (existingMilestones.length === 0) {
    return res.status(400).json({ message: 'No milestones found for project' });
  }

  const milestoneTotal = existingMilestones.reduce((sum, milestone) => sum + milestone.payment_amount, 0);
  if (Number(milestoneTotal.toFixed(2)) > Number(project.budget.toFixed(2))) {
    return res.status(400).json({
      message: 'Milestone payment total exceeds project budget'
    });
  }

  await Milestone.updateMany({ project_id: id }, { approval_status: 'approved' });

  for (const milestone of existingMilestones) {
    const lockExists = await Payment.findOne({ milestone_id: milestone._id, status: 'locked' });
    if (!lockExists) {
      await Payment.create({
        project_id: project._id,
        milestone_id: milestone._id,
        employer_id: project.employer_id,
        freelancer_id: project.freelancer_id,
        amount: milestone.payment_amount,
        action: 'release_full',
        status: 'locked'
      });
    }
  }

  project.status = 'in_progress';
  project.escrow_status = 'funded';
  project.escrow_locked_total = Number(milestoneTotal.toFixed(2));
  await project.save();
  await recomputeProjectEscrow(project._id);

  const fundedMilestones = await Milestone.find({ project_id: id }).sort({ createdAt: 1 });

  return res.status(200).json({
    message: 'Milestones approved and escrow funded',
    project,
    milestones: fundedMilestones
  });
};

module.exports = {
  createProject,
  getProjectById,
  listProjects,
  getProjectMilestones,
  approveMilestones
};
