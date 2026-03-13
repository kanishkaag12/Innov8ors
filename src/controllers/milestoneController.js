const Milestone = require('../models/Milestone');
const Submission = require('../models/Submission');

const submitMilestoneWork = async (req, res) => {
  const { id } = req.params;
  const { freelancer_id, text, github_link, file_url } = req.body;

  if (!freelancer_id) {
    return res.status(400).json({ message: 'freelancer_id is required' });
  }

  if (!text && !github_link && !file_url) {
    return res.status(400).json({
      message: 'At least one submission field is required: text, github_link, or file_url'
    });
  }

  const milestone = await Milestone.findById(id);
  if (!milestone) {
    return res.status(404).json({ message: 'Milestone not found' });
  }

  const submission = await Submission.create({
    milestone_id: id,
    freelancer_id,
    text: text || null,
    github_link: github_link || null,
    file_url: file_url || null
  });

  milestone.status = 'submitted';
  milestone.freelancer_id = freelancer_id;
  await milestone.save();

  return res.status(201).json({
    message: 'Milestone submitted successfully',
    submission
  });
};

const getMilestonesByProject = async (req, res) => {
  const { projectId } = req.params;
  const milestones = await Milestone.find({ project_id: projectId }).sort({ createdAt: 1 });

  return res.status(200).json({
    project_id: projectId,
    milestones
  });
};

const getMilestonesByFreelancer = async (req, res) => {
  const { freelancerId } = req.params;
  const milestones = await Milestone.find({ freelancer_id: freelancerId }).sort({ createdAt: -1 });

  return res.status(200).json({
    freelancer_id: freelancerId,
    milestones
  });
};

module.exports = {
  submitMilestoneWork,
  getMilestonesByProject,
  getMilestonesByFreelancer
};
