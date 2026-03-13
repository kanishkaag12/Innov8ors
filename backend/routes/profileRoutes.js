const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/profile/categories-skills
router.post('/categories-skills', async (req, res) => {
  try {
    const { userId, category, subCategories, skills, hourlyRate } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Update freelancerProfile
    user.freelancerProfile = {
      category,
      subCategories,
      skills,
      hourlyRate
    };

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
        freelancerProfile: user.freelancerProfile
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/profile/complete
router.post('/complete', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.onboardingCompleted = true;
    await user.save();

    res.status(200).json({
      message: 'Onboarding marked as completed',
      user: {
        _id: user._id,
        onboardingCompleted: user.onboardingCompleted
      }
    });

  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
