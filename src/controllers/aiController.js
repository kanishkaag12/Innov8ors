const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Submission = require('../models/Submission');
const {
  generateMilestonesFromDescription,
  verifyMilestoneSubmissionWithAI
} = require('../services/openaiService');
const { processEscrowDecision } = require('../services/escrowService');

const generateMilestones = async (req, res) => {
  const { project_id, title, description, budget, deadline } = req.body;

  let project = null;
  let finalTitle = title;
  let finalDescription = description;
  let finalBudget = budget;
  let finalDeadline = deadline;

  if (project_id) {
    project = await Project.findById(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    finalTitle = project.title;
    finalDescription = project.description;
    finalBudget = project.budget;
    finalDeadline = project.deadline;
  }

  if (!finalTitle || !finalDescription || !finalBudget || !finalDeadline) {
    return res.status(400).json({
      message:
        'Provide project_id or all fields: title, description, budget, deadline'
    });
  }

  const milestones = await generateMilestonesFromDescription({
    title: finalTitle,
    description: finalDescription,
    budget: finalBudget,
    deadline: finalDeadline
  });

  let savedMilestones = [];
  if (project) {
    savedMilestones = await Milestone.insertMany(
      milestones.map((milestone) => ({
        project_id: project._id,
        freelancer_id: project.freelancer_id,
        title: milestone.title,
        description: milestone.description,
        deliverable: milestone.deliverable,
        estimated_time: milestone.timeline || milestone.estimated_time,
        timeline: milestone.timeline || milestone.estimated_time,
        payment_amount: milestone.payment_amount
      }))
    );
  }

  return res.status(200).json({
    message: 'Milestones generated successfully',
    milestones: project ? savedMilestones : milestones
  });
};

const verifyMilestone = async (req, res) => {
  const { milestone_id, submission_id } = req.body;

  if (!milestone_id || !submission_id) {
    return res.status(400).json({ message: 'milestone_id and submission_id are required' });
  }

  const milestone = await Milestone.findById(milestone_id);
  if (!milestone) {
    return res.status(404).json({ message: 'Milestone not found' });
  }

  const submission = await Submission.findById(submission_id);
  if (!submission) {
    return res.status(404).json({ message: 'Submission not found' });
  }

  if (String(submission.milestone_id) !== String(milestone._id)) {
    return res.status(400).json({
      message: 'Submission does not belong to provided milestone'
    });
  }

  const verification = await verifyMilestoneSubmissionWithAI({ milestone, submission });

  milestone.verification_result = verification.status;
  milestone.ai_feedback = verification.feedback;
  milestone.ai_quality_score = verification.quality_score;
  milestone.status = verification.status === 'not_completed' ? 'rejected' : 'verified';
  await milestone.save();

  const escrow = await processEscrowDecision({ milestoneId: milestone._id });

  return res.status(200).json({
    status: verification.status,
    feedback: verification.feedback,
    quality_score: verification.quality_score,
    payment: escrow.payment
  });
};

module.exports = {
  generateMilestones,
  verifyMilestone
};
