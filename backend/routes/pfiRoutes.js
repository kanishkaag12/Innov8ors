const express = require('express');
const router = express.Router();
const PFIService = require('../services/pfiService');
const User = require('../models/User');
const Contract = require('../models/Contract');
const Proposal = require('../models/Proposal');
const Project = require('../models/Project');
const Conversation = require('../models/Conversation');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/authMiddleware');

function buildOnboardingChecklist(user, proposalsSent) {
  const profile = user?.freelancerProfile || {};
  const checklist = [
    { id: 'complete_profile', label: 'Complete Profile', completed: Boolean(profile.headline && profile.bio && profile.location) },
    { id: 'add_skills', label: 'Add Skills', completed: Array.isArray(profile.skills) && profile.skills.length >= 3 },
    { id: 'upload_portfolio', label: 'Upload Portfolio', completed: Array.isArray(profile.portfolioLinks) && profile.portfolioLinks.length > 0 },
    { id: 'verify_identity', label: 'Verify Identity', completed: Boolean(profile.identityVerified || user?.identityVerified) },
    { id: 'apply_first_job', label: 'Apply To First Job', completed: Number(proposalsSent || 0) > 0 }
  ];

  const completedCount = checklist.filter((item) => item.completed).length;
  const progress = Math.round((completedCount / checklist.length) * 100);

  return {
    checklist,
    completedCount,
    totalCount: checklist.length,
    progress
  };
}

// GET /api/freelancers/me/dashboard-summary - Get authenticated freelancer dashboard data
router.get('/me/dashboard-summary', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'freelancer') {
      return res.status(400).json({ message: 'User is not a freelancer' });
    }

    const freelancerId = String(user._id);

    const [
      pfiData,
      activeContracts,
      proposalsSent,
      walletUser,
      conversations,
      earningsAggregate
    ] = await Promise.all([
      PFIService.getPFIScore(freelancerId),
      Contract.find({ freelancerId: user._id, status: 'active' }).select('projectId status').lean(),
      Proposal.countDocuments({ freelancerId: user._id }),
      User.findById(user._id).select('balance escrowLocked freelancerProfile').lean(),
      Conversation.find({ participants: user._id }).select('unreadCounts').lean(),
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(freelancerId),
            type: 'credit'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const projectIds = activeContracts
      .map((contract) => String(contract.projectId || '').trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    const activeProjects = projectIds.length
      ? await Project.find({ _id: { $in: projectIds } })
          .select('title description budget createdAt employer_id')
          .populate('employer_id', 'name email')
          .sort({ createdAt: -1 })
          .lean()
      : [];

    const unreadCount = conversations.reduce((sum, conversation) => {
      const counts = conversation?.unreadCounts || {};
      const count = Number(counts[freelancerId] || 0);
      return sum + (Number.isFinite(count) ? count : 0);
    }, 0);

    const onboarding = buildOnboardingChecklist(walletUser || user, proposalsSent);

    return res.json({
      success: true,
      data: {
        authenticatedUserId: freelancerId,
        quickStats: {
          activeContracts: activeContracts.length,
          proposalsSent,
          profileViews: 0,
          earnings: Number(earningsAggregate?.[0]?.total || 0),
          escrowBalance: Number(walletUser?.escrowLocked || 0),
          pfiScore: Number(pfiData?.score || 0),
          pfiStatus: pfiData?.status || 'Getting Started'
        },
        messages: {
          unreadCount,
          emptyStateMessage: unreadCount === 0 ? 'No messages yet.' : ''
        },
        onboarding,
        activeProjects: activeProjects.map((project) => ({
          id: String(project._id),
          title: project.title,
          description: project.description,
          budget: Number(project.budget || 0),
          employerName: project.employer_id?.name || 'Client',
          createdAt: project.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get freelancer dashboard summary error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/freelancers/me/pfi - Get current authenticated freelancer PFI score
router.get('/me/pfi', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'freelancer') {
      return res.status(400).json({ message: 'User is not a freelancer' });
    }

    const pfiData = await PFIService.getPFIScore(user._id);
    res.json({
      success: true,
      data: pfiData
    });
  } catch (error) {
    console.error('Get authenticated PFI score error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/freelancers/me/pfi/history - Get authenticated freelancer PFI history
router.get('/me/pfi/history', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'freelancer') {
      return res.status(400).json({ message: 'User is not a freelancer' });
    }

    const { limit = 10 } = req.query;
    const history = await PFIService.getPFIHistory(user._id, parseInt(limit, 10));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get authenticated PFI history error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/freelancers/me/pfi/suggestions - Get authenticated freelancer improvement suggestions
router.get('/me/pfi/suggestions', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'freelancer') {
      return res.status(400).json({ message: 'User is not a freelancer' });
    }

    const pfiData = await PFIService.calculatePFI(user._id);

    res.json({
      success: true,
      data: {
        current_score: pfiData.score,
        breakdown: pfiData.breakdown,
        suggestions: pfiData.recommendations.map((text) => ({
          title: text,
          description: text
        }))
      }
    });
  } catch (error) {
    console.error('Get authenticated PFI suggestions error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});


// GET /api/freelancers/:freelancerId/pfi - Get current PFI score
router.get('/:freelancerId/pfi', async (req, res) => {
  try {
    const { freelancerId } = req.params;

    // Verify user exists and is a freelancer
    const user = await User.findById(freelancerId);
    if (!user) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }

    if (user.role !== 'freelancer') {
      return res.status(400).json({ message: 'User is not a freelancer' });
    }

    const pfiData = await PFIService.getPFIScore(freelancerId);

    res.json({
      success: true,
      data: pfiData
    });

  } catch (error) {
    console.error('Get PFI score error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// POST /api/freelancers/:freelancerId/pfi/recompute - Recompute PFI score
router.post('/:freelancerId/pfi/recompute', async (req, res) => {
  try {
    const { freelancerId } = req.params;
    const { reason_codes = [], metadata = {} } = req.body;

    // Verify user exists and is a freelancer
    const user = await User.findById(freelancerId);
    if (!user) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }

    if (user.role !== 'freelancer') {
      return res.status(400).json({ message: 'User is not a freelancer' });
    }

    const pfiData = await PFIService.calculatePFIScore(
      freelancerId,
      'manual_recompute',
      reason_codes,
      metadata
    );

    res.json({
      success: true,
      message: 'PFI score recalculated successfully',
      data: pfiData
    });

  } catch (error) {
    console.error('Recompute PFI score error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/freelancers/:freelancerId/pfi/history - Get PFI score history
router.get('/:freelancerId/pfi/history', async (req, res) => {
  try {
    const { freelancerId } = req.params;
    const { limit = 10 } = req.query;

    // Verify user exists and is a freelancer
    const user = await User.findById(freelancerId);
    if (!user) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }

    if (user.role !== 'freelancer') {
      return res.status(400).json({ message: 'User is not a freelancer' });
    }

    const history = await PFIService.getPFIHistory(freelancerId, parseInt(limit));

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Get PFI history error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/freelancers/:freelancerId/pfi/suggestions - Get improvement suggestions
router.get('/:freelancerId/pfi/suggestions', async (req, res) => {
  try {
    const { freelancerId } = req.params;

    // Verify user exists and is a freelancer
    const user = await User.findById(freelancerId);
    if (!user) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }

    if (user.role !== 'freelancer') {
      return res.status(400).json({ message: 'User is not a freelancer' });
    }

    const pfiData = await PFIService.getPFIScore(freelancerId);
    const suggestions = PFIService.getImprovementSuggestions(pfiData.factor_breakdown);

    res.json({
      success: true,
      data: {
        current_score: pfiData.score,
        suggestions
      }
    });

  } catch (error) {
    console.error('Get PFI suggestions error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;