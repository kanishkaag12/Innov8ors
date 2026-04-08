const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/authMiddleware');
const { buildFreelancerMatchingText } = require('../services/jobMatchingService');
const { generateEmbedding } = require('../services/embeddingService');

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function buildFreelancerProfile(user) {
  const profile = user.freelancerProfile || {};
  return {
    fullName: profile.fullName || user.name || '',
    email: profile.email || user.email || '',
    headline: profile.headline || '',
    bio: profile.bio || '',
    location: profile.location || '',
    availability: profile.availability || '',
    skills: normalizeArray(profile.skills),
    interests: normalizeArray(profile.interests),
    preferredCategories: normalizeArray(profile.preferredCategories),
    primaryCategory: profile.primaryCategory || '',
    experienceLevel: profile.experienceLevel || '',
    preferredBudgetMin: profile.preferredBudgetMin,
    preferredBudgetMax: profile.preferredBudgetMax,
    preferredProjectType: profile.preferredProjectType || '',
    portfolioLinks: normalizeArray(profile.portfolioLinks),
    languages: normalizeArray(profile.languages),
    profileEmbedding: Array.isArray(profile.profileEmbedding) ? profile.profileEmbedding : [],
    embeddingText: profile.embeddingText || '',
    lastEmbeddingAt: profile.lastEmbeddingAt || null
  };
}

function buildEmployerProfile(user) {
  const profile = user.employerProfile || {};
  return {
    fullName: profile.fullName || user.name || '',
    email: profile.email || user.email || '',
    companyName: profile.companyName || user.companyName || '',
    about: profile.about || '',
    location: profile.location || '',
    website: profile.website || user.website || '',
    industry: profile.industry || '',
    hiringInterests: normalizeArray(profile.hiringInterests),
    preferredFreelancerCategories: normalizeArray(profile.preferredFreelancerCategories),
    companySize: profile.companySize || user.companySize || '',
    hiringGoals: profile.hiringGoals || '',
    verificationInfo: profile.verificationInfo || ''
  };
}

function buildProfileResponse(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    pfi_score: user.pfi_score,
    onboardingCompleted: user.onboardingCompleted,
    companyName: user.companyName || '',
    companySize: user.companySize || '',
    website: user.website || '',
    freelancerProfile: buildFreelancerProfile(user),
    employerProfile: buildEmployerProfile(user)
  };
}

async function ensureProfileForUser(user) {
  let changed = false;

  if (user.role === 'freelancer') {
    const freelancerProfile = buildFreelancerProfile(user);
    if (JSON.stringify(user.freelancerProfile || {}) !== JSON.stringify(freelancerProfile)) {
      user.freelancerProfile = freelancerProfile;
      changed = true;
    }
  }

  if (user.role === 'employer') {
    const employerProfile = buildEmployerProfile(user);
    if (JSON.stringify(user.employerProfile || {}) !== JSON.stringify(employerProfile)) {
      user.employerProfile = employerProfile;
      changed = true;
    }

    if (!user.companyName && employerProfile.companyName) {
      user.companyName = employerProfile.companyName;
      changed = true;
    }

    if (!user.companySize && employerProfile.companySize) {
      user.companySize = employerProfile.companySize;
      changed = true;
    }

    if (!user.website && employerProfile.website) {
      user.website = employerProfile.website;
      changed = true;
    }
  }

  if (changed) {
    await user.save();
  }

  return user;
}

async function refreshFreelancerEmbedding(user) {
  const matchingText = buildFreelancerMatchingText(user);

  if (!matchingText) {
    user.freelancerProfile.profileEmbedding = [];
    user.freelancerProfile.embeddingText = '';
    user.freelancerProfile.lastEmbeddingAt = null;
    await user.save();
    return;
  }

  const embedding = await generateEmbedding(matchingText);
  user.freelancerProfile.profileEmbedding = embedding;
  user.freelancerProfile.embeddingText = matchingText;
  user.freelancerProfile.lastEmbeddingAt = new Date();
  await user.save();
}

router.post('/categories-skills', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers can update freelancer profile details.' });
    }

    await ensureProfileForUser(req.user);

    req.user.freelancerProfile = {
      ...buildFreelancerProfile(req.user),
      primaryCategory: normalizeString(req.body.category),
      preferredCategories: [
        normalizeString(req.body.category),
        ...normalizeArray(req.body.subCategories)
      ].filter(Boolean),
      skills: normalizeArray(req.body.skills)
    };

    await req.user.save();
    await refreshFreelancerEmbedding(req.user);

    return res.status(200).json({
      message: 'Profile updated successfully',
      profile: buildProfileResponse(req.user)
    });
  } catch (error) {
    console.error('Update categories/skills error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/complete', authenticateToken, async (req, res) => {
  try {
    req.user.onboardingCompleted = true;
    await ensureProfileForUser(req.user);
    await req.user.save();

    return res.status(200).json({
      message: 'Onboarding marked as completed',
      profile: buildProfileResponse(req.user)
    });
  } catch (error) {
    console.error('Complete profile error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await ensureProfileForUser(user);

    return res.status(200).json({ profile: buildProfileResponse(user) });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
});

router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await ensureProfileForUser(user);

    if (user.role === 'freelancer') {
      const incoming = req.body.freelancerProfile || {};
      const fullName = normalizeString(incoming.fullName) || user.name;

      user.name = fullName;
      user.freelancerProfile = {
        ...buildFreelancerProfile(user),
        fullName,
        email: user.email,
        headline: normalizeString(incoming.headline),
        bio: normalizeString(incoming.bio),
        location: normalizeString(incoming.location),
        availability: normalizeString(incoming.availability),
        skills: normalizeArray(incoming.skills),
        interests: normalizeArray(incoming.interests),
        preferredCategories: normalizeArray(incoming.preferredCategories),
        primaryCategory: normalizeString(incoming.primaryCategory),
        experienceLevel: normalizeString(incoming.experienceLevel),
        preferredBudgetMin:
          incoming.preferredBudgetMin === '' || incoming.preferredBudgetMin === null || incoming.preferredBudgetMin === undefined
            ? undefined
            : Number(incoming.preferredBudgetMin),
        preferredBudgetMax:
          incoming.preferredBudgetMax === '' || incoming.preferredBudgetMax === null || incoming.preferredBudgetMax === undefined
            ? undefined
            : Number(incoming.preferredBudgetMax),
        preferredProjectType: normalizeString(incoming.preferredProjectType),
        portfolioLinks: normalizeArray(incoming.portfolioLinks),
        languages: normalizeArray(incoming.languages),
        profileEmbedding: Array.isArray(user.freelancerProfile?.profileEmbedding)
          ? user.freelancerProfile.profileEmbedding
          : [],
        embeddingText: user.freelancerProfile?.embeddingText || '',
        lastEmbeddingAt: user.freelancerProfile?.lastEmbeddingAt || null
      };

      if (!user.freelancerProfile.headline || !user.freelancerProfile.bio) {
        return res.status(400).json({ message: 'Headline and bio are required for freelancer profiles.' });
      }

      await user.save();
      await refreshFreelancerEmbedding(user);
    } else if (user.role === 'employer') {
      const incoming = req.body.employerProfile || {};
      const fullName = normalizeString(incoming.fullName) || user.name;
      const companyName = normalizeString(incoming.companyName) || user.companyName || '';

      user.name = fullName;
      user.companyName = companyName;
      user.companySize = normalizeString(incoming.companySize) || user.companySize || '';
      user.website = normalizeString(incoming.website) || user.website || '';

      user.employerProfile = {
        ...buildEmployerProfile(user),
        fullName,
        email: user.email,
        companyName,
        about: normalizeString(incoming.about),
        location: normalizeString(incoming.location),
        website: user.website,
        industry: normalizeString(incoming.industry),
        hiringInterests: normalizeArray(incoming.hiringInterests),
        preferredFreelancerCategories: normalizeArray(incoming.preferredFreelancerCategories),
        companySize: user.companySize,
        hiringGoals: normalizeString(incoming.hiringGoals),
        verificationInfo: normalizeString(incoming.verificationInfo)
      };

      if (!user.employerProfile.fullName) {
        return res.status(400).json({ message: 'Full name is required for employer profiles.' });
      }

      if (!user.employerProfile.companyName) {
        return res.status(400).json({ message: 'Company name is required for employer profiles.' });
      }

      await user.save();
    } else {
      return res.status(400).json({ message: 'Unsupported role for profile updates.' });
    }

    const refreshedUser = await User.findById(user._id).select('-password');
    return res.status(200).json({
      message: 'Profile updated successfully',
      profile: buildProfileResponse(refreshedUser)
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

module.exports = router;
