const express = require('express');
const router = express.Router();
const PFIService = require('../services/pfiService');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/authMiddleware');

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

    const pfiData = await PFIService.getPFIScore(user._id);
    const suggestions = PFIService.getImprovementSuggestions(pfiData.factor_breakdown);

    res.json({
      success: true,
      data: {
        current_score: pfiData.score,
        suggestions
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