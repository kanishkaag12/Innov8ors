const {
  rankProjectFreelancers,
  getFreelancerInsight
} = require('../services/mlRankingService');
const Proposal = require('../models/Proposal');

async function getRankedFreelancers(req, res) {
  try {
    const { id: projectId } = req.params;

    const response = await rankProjectFreelancers(projectId, { forceRecompute: false });

    const proposals = await Proposal.find({ projectId: String(projectId) })
      .sort({ createdAt: -1 })
      .lean();

    const proposalByFreelancerId = new Map(
      proposals.map((proposal) => [String(proposal.freelancerId), proposal])
    );

    const rankedFreelancers = (response.rankedFreelancers || []).map((entry) => {
      const proposal = proposalByFreelancerId.get(String(entry.freelancer_id));
      if (!proposal) {
        return entry;
      }

      return {
        ...entry,
        proposal_id: String(proposal._id),
        proposal_status: proposal.status || 'pending',
        conversation_id: proposal.conversationId ? String(proposal.conversationId) : null,
        freelancer_email: proposal.freelancerEmail || '',
        requested_at: proposal.createdAt
      };
    });

    return res.status(200).json({
      projectId: response.projectId,
      modelVersion: response.modelVersion,
      rankedFreelancers
    });
  } catch (error) {
    console.error('ML ranking list error:', error);
    const status = error.status || 500;
    return res.status(status).json({
      message: error.message || 'Failed to compute ML ranking.'
    });
  }
}

async function getFreelancerInsightByProject(req, res) {
  try {
    const { id: projectId, freelancerId } = req.params;

    const insight = await getFreelancerInsight(projectId, freelancerId);

    return res.status(200).json(insight);
  } catch (error) {
    console.error('ML insight error:', error);
    const status = error.status || 500;
    return res.status(status).json({
      message: error.message || 'Failed to load freelancer ML insight.'
    });
  }
}

async function recomputeProjectRanking(req, res) {
  try {
    const { projectId } = req.params;

    const response = await rankProjectFreelancers(projectId, { forceRecompute: true });

    return res.status(200).json({
      projectId: response.projectId,
      modelVersion: response.modelVersion,
      rankedFreelancers: response.rankedFreelancers,
      message: 'ML ranking recomputed successfully.'
    });
  } catch (error) {
    console.error('ML ranking recompute error:', error);
    const status = error.status || 500;
    return res.status(status).json({
      message: error.message || 'Failed to recompute ML ranking.'
    });
  }
}

module.exports = {
  getRankedFreelancers,
  getFreelancerInsightByProject,
  recomputeProjectRanking
};
