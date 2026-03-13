const Milestone = require('../models/Milestone');
const Payment = require('../models/Payment');
const Project = require('../models/Project');

const recomputeProjectEscrow = async (projectId) => {
  const payments = await Payment.find({ project_id: projectId });

  const releasedTotal = payments
    .filter((payment) => payment.status === 'released')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const refundedTotal = payments
    .filter((payment) => payment.status === 'refunded')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const lockedTotal = payments
    .filter((payment) => payment.status === 'locked')
    .reduce((sum, payment) => sum + payment.amount, 0);

  let escrowStatus = 'unfunded';
  if (releasedTotal > 0 && refundedTotal > 0) {
    escrowStatus = 'partially_released';
  } else if (releasedTotal > 0) {
    escrowStatus = 'released';
  } else if (refundedTotal > 0) {
    escrowStatus = 'refunded';
  } else if (lockedTotal > 0) {
    escrowStatus = 'funded';
  }

  await Project.findByIdAndUpdate(projectId, {
    escrow_status: escrowStatus,
    escrow_locked_total: Number(lockedTotal.toFixed(2)),
    escrow_released_total: Number(releasedTotal.toFixed(2)),
    escrow_refunded_total: Number(refundedTotal.toFixed(2))
  });
};

const processEscrowDecision = async ({ milestoneId }) => {
  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  if (!milestone.verification_result) {
    throw new Error('Milestone must be verified before releasing payment');
  }

  const project = await Project.findById(milestone.project_id);
  if (!project) {
    throw new Error('Project not found for this milestone');
  }

  const existingPayment = await Payment.findOne({ milestone_id: milestone._id, status: { $ne: 'locked' } });
  if (existingPayment) {
    return { milestone, project, payment: existingPayment, alreadyProcessed: true };
  }

  const lockedRecord = await Payment.findOne({ milestone_id: milestone._id, status: 'locked' });

  let action;
  let amount;
  let status;

  if (milestone.verification_result === 'completed') {
    action = 'release_full';
    amount = milestone.payment_amount;
    status = 'released';
  } else if (milestone.verification_result === 'partial') {
    action = 'release_partial';
    amount = milestone.payment_amount * 0.5;
    status = 'released';
  } else {
    action = 'refund_employer';
    amount = milestone.payment_amount;
    status = 'refunded';
  }

  let payment;
  if (lockedRecord) {
    lockedRecord.action = action;
    lockedRecord.amount = Number(amount.toFixed(2));
    lockedRecord.status = status;
    payment = await lockedRecord.save();
  } else {
    payment = await Payment.create({
      project_id: project._id,
      milestone_id: milestone._id,
      employer_id: project.employer_id,
      freelancer_id: milestone.freelancer_id,
      amount: Number(amount.toFixed(2)),
      action,
      status
    });
  }

  milestone.status = milestone.verification_result === 'not_completed' ? 'rejected' : 'paid';
  await milestone.save();

  await recomputeProjectEscrow(project._id);

  return { milestone, project, payment, alreadyProcessed: false };
};

module.exports = {
  recomputeProjectEscrow,
  processEscrowDecision
};
