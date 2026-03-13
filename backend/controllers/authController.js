const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: role === 'employer' ? 'employer' : 'freelancer'
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '1d' }
    );

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      pfi_score: user.pfi_score,
      onboardingCompleted: user.onboardingCompleted
    };

    return res.status(201).json({
      message: 'Signup successful',
      token,
      user: safeUser
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

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '1d' }
    );

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      pfi_score: user.pfi_score,
      onboardingCompleted: user.onboardingCompleted
    };

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
    });
  }
};

exports.onboarding = async (req, res) => {
  try {
    const { userId, companySize, companyName, website } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.companySize = companySize;
    user.companyName = companyName;
    user.website = website;
    user.onboardingCompleted = true;

    await user.save();

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      pfi_score: user.pfi_score,
      onboardingCompleted: user.onboardingCompleted
    };

    return res.status(200).json({
      message: 'Onboarding complete',
      user: safeUser
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};
