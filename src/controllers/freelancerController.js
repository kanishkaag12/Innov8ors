const Milestone = require('../models/Milestone');
const Submission = require('../models/Submission');
const Freelancer = require('../models/Freelancer');
const User = require('../models/User');

const getPFI = async (req, res) => {
  const { id } = req.params;

  const milestones = await Milestone.find({ freelancer_id: id });

  if (milestones.length === 0) {
    const user = await User.findById(id);
    return res.status(200).json({
      freelancer_id: id,
      name: user?.name || null,
      email: user?.email || null,
      pfi_score: 0,
      breakdown: {
        milestone_success_rate: 0,
        deadline_adherence: 0,
        ai_quality_score: 0
      }
    });
  }

  const totalMilestones = milestones.length;

  const successfulCount = milestones.filter((milestone) =>
    ['completed', 'partial'].includes(milestone.verification_result)
  ).length;
  const milestoneSuccessRate = (successfulCount / totalMilestones) * 100;

  const milestoneIds = milestones.map((milestone) => milestone._id);
  const submissions = await Submission.find({ milestone_id: { $in: milestoneIds } });
  const submissionMap = new Map(
    submissions.map((submission) => [String(submission.milestone_id), submission])
  );

  let onTimeCount = 0;
  let dueDatedCount = 0;
  milestones.forEach((milestone) => {
    if (!milestone.due_date) {
      return;
    }

    dueDatedCount += 1;
    const submission = submissionMap.get(String(milestone._id));
    if (submission && new Date(submission.submitted_at) <= new Date(milestone.due_date)) {
      onTimeCount += 1;
    }
  });

  const deadlineAdherence = dueDatedCount === 0 ? 100 : (onTimeCount / dueDatedCount) * 100;

  const qualityScores = milestones
    .map((milestone) => milestone.ai_quality_score)
    .filter((score) => Number.isFinite(score));
  const aiQualityScore =
    qualityScores.length === 0
      ? 0
      : qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

  const pfiScore =
    milestoneSuccessRate * 0.4 +
    deadlineAdherence * 0.3 +
    aiQualityScore * 0.3;

  await Freelancer.findOneAndUpdate(
    { freelancer_id: id },
    {
      freelancer_id: id,
      pfi_score: Number(pfiScore.toFixed(2))
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const user = await User.findById(id);
  if (user && user.role === 'freelancer') {
    user.pfi_score = Number(pfiScore.toFixed(2));
    await user.save();
  }

  return res.status(200).json({
    freelancer_id: id,
    name: user?.name || null,
    email: user?.email || null,
    pfi_score: Number(pfiScore.toFixed(2)),
    breakdown: {
      milestone_success_rate: Number(milestoneSuccessRate.toFixed(2)),
      deadline_adherence: Number(deadlineAdherence.toFixed(2)),
      ai_quality_score: Number(aiQualityScore.toFixed(2))
    }
  });
};

module.exports = {
  getPFI
};
