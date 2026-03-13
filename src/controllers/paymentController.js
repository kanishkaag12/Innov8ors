const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const Payment = require('../models/Payment');
const { processEscrowDecision } = require('../services/escrowService');

const releasePayment = async (req, res) => {
  const { milestone_id } = req.body;

  if (!milestone_id) {
    return res.status(400).json({ message: 'milestone_id is required' });
  }

  const result = await processEscrowDecision({ milestoneId: milestone_id });

  return res.status(200).json({
    message: result.alreadyProcessed
      ? 'Escrow decision already processed for this milestone'
      : 'Escrow decision processed',
    verification_result: result.milestone.verification_result,
    payment: result.payment
  });
};

const getPaymentsByProject = async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const payments = await Payment.find({ project_id: projectId }).sort({ createdAt: -1 });

  return res.status(200).json({
    project_id: projectId,
    payments
  });
};

const getEscrowDashboard = async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const milestones = await Milestone.find({ project_id: projectId }).sort({ createdAt: 1 });
  const payments = await Payment.find({ project_id: projectId });

  const released = payments
    .filter((payment) => payment.status === 'released')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const refunded = payments
    .filter((payment) => payment.status === 'refunded')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const locked = payments
    .filter((payment) => payment.status === 'locked')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const pendingMilestones = milestones.filter((milestone) =>
    ['pending', 'submitted', 'verified'].includes(milestone.status)
  ).length;

  return res.status(200).json({
    project_id: projectId,
    total_budget_locked: Number(locked.toFixed(2)),
    payments_released: Number(released.toFixed(2)),
    refunded_amount: Number(refunded.toFixed(2)),
    milestone_progress: {
      total: milestones.length,
      paid: milestones.filter((milestone) => milestone.status === 'paid').length,
      pending: pendingMilestones
    },
    pending_milestones: pendingMilestones,
    milestones,
    payments
  });
};

module.exports = {
  releasePayment,
  getPaymentsByProject,
  getEscrowDashboard
};
