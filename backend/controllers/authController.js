const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function buildSafeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    pfi_score: user.pfi_score,
    onboardingCompleted: user.onboardingCompleted,
    companyName: user.companyName,
    companySize: user.companySize,
    website: user.website,
    freelancerProfile: user.freelancerProfile,
    employerProfile: user.employerProfile
  };
}

function buildDefaultFreelancerProfile(user) {
  return {
    fullName: user?.freelancerProfile?.fullName || user?.name || '',
    email: user?.freelancerProfile?.email || user?.email || '',
    headline: user?.freelancerProfile?.headline || '',
    bio: user?.freelancerProfile?.bio || '',
    location: user?.freelancerProfile?.location || '',
    availability: user?.freelancerProfile?.availability || '',
    skills: Array.isArray(user?.freelancerProfile?.skills) ? user.freelancerProfile.skills : [],
    interests: Array.isArray(user?.freelancerProfile?.interests) ? user.freelancerProfile.interests : [],
    preferredCategories: Array.isArray(user?.freelancerProfile?.preferredCategories)
      ? user.freelancerProfile.preferredCategories
      : [],
    primaryCategory: user?.freelancerProfile?.primaryCategory || '',
    experienceLevel: user?.freelancerProfile?.experienceLevel || undefined,
    preferredBudgetMin: user?.freelancerProfile?.preferredBudgetMin,
    preferredBudgetMax: user?.freelancerProfile?.preferredBudgetMax,
    preferredProjectType: user?.freelancerProfile?.preferredProjectType || undefined,
    portfolioLinks: Array.isArray(user?.freelancerProfile?.portfolioLinks)
      ? user.freelancerProfile.portfolioLinks
      : [],
    languages: Array.isArray(user?.freelancerProfile?.languages) ? user.freelancerProfile.languages : [],
    profileEmbedding: Array.isArray(user?.freelancerProfile?.profileEmbedding)
      ? user.freelancerProfile.profileEmbedding
      : [],
    embeddingText: user?.freelancerProfile?.embeddingText || '',
    lastEmbeddingAt: user?.freelancerProfile?.lastEmbeddingAt || null
  };
}

function buildDefaultEmployerProfile(user) {
  return {
    fullName: user?.employerProfile?.fullName || user?.name || '',
    email: user?.employerProfile?.email || user?.email || '',
    companyName: user?.employerProfile?.companyName || user?.companyName || '',
    about: user?.employerProfile?.about || '',
    location: user?.employerProfile?.location || '',
    website: user?.employerProfile?.website || user?.website || '',
    industry: user?.employerProfile?.industry || '',
    hiringInterests: Array.isArray(user?.employerProfile?.hiringInterests)
      ? user.employerProfile.hiringInterests
      : [],
    preferredFreelancerCategories: Array.isArray(user?.employerProfile?.preferredFreelancerCategories)
      ? user.employerProfile.preferredFreelancerCategories
      : [],
    companySize: user?.employerProfile?.companySize || user?.companySize || '',
    hiringGoals: user?.employerProfile?.hiringGoals || '',
    verificationInfo: user?.employerProfile?.verificationInfo || ''
  };
}

exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, companyName, companySize, website } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = role === 'employer' ? 'employer' : 'freelancer';
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      companyName: normalizedRole === 'employer' ? (companyName || '').trim() : undefined,
      companySize: normalizedRole === 'employer' ? (companySize || '').trim() : undefined,
      website: normalizedRole === 'employer' ? (website || '').trim() : undefined
    });

    if (normalizedRole === 'freelancer') {
      user.freelancerProfile = buildDefaultFreelancerProfile(user);
    } else if (normalizedRole === 'employer') {
      user.employerProfile = buildDefaultEmployerProfile(user);
    }

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '1d' }
    );

    return res.status(201).json({
      message: 'Signup successful',
      token,
      user: buildSafeUser(user)
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.password) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    if (user.role === 'freelancer' && !user.freelancerProfile) {
      user.freelancerProfile = buildDefaultFreelancerProfile(user);
      await user.save();
    }

    if (user.role === 'employer' && !user.employerProfile) {
      user.employerProfile = buildDefaultEmployerProfile(user);
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: buildSafeUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Server error'
    });
  }
};

exports.onboarding = async (req, res) => {
  try {
    const { companySize, companyName, website } = req.body;
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.companySize = companySize || user.companySize || '';
    user.companyName = companyName || user.companyName || '';
    user.website = website || user.website || '';
    user.onboardingCompleted = true;

    if (user.role === 'employer') {
      user.employerProfile = {
        ...buildDefaultEmployerProfile(user),
        ...user.employerProfile,
        fullName: user.employerProfile?.fullName || user.name,
        email: user.employerProfile?.email || user.email,
        companyName: user.employerProfile?.companyName || user.companyName || companyName || '',
        website: user.employerProfile?.website || user.website || website || '',
        companySize: user.employerProfile?.companySize || user.companySize || companySize || ''
      };
    } else if (user.role === 'freelancer') {
      user.freelancerProfile = {
        ...buildDefaultFreelancerProfile(user),
        ...user.freelancerProfile,
        fullName: user.freelancerProfile?.fullName || user.name,
        email: user.freelancerProfile?.email || user.email
      };
    }

    await user.save();

    return res.status(200).json({
      message: 'Onboarding complete',
      user: buildSafeUser(user)
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};
