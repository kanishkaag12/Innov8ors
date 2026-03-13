const crypto = require('crypto');
const User = require('../models/User');

const hashPassword = (password) =>
  crypto.createHash('sha256').update(password).digest('hex');

const issueToken = (user) => {
  const payload = `${user._id}:${user.email}:${Date.now()}:${Math.random()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  pfi_score: user.pfi_score || 0
});

const signup = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({
      message: 'name, email, password, and role are required'
    });
  }

  if (!['employer', 'freelancer'].includes(role)) {
    return res.status(400).json({ message: 'role must be employer or freelancer' });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ message: 'User already exists with this email' });
  }

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password_hash: hashPassword(password),
    role
  });

  const token = issueToken(user);

  return res.status(201).json({
    message: 'Account created successfully',
    token,
    user: sanitizeUser(user)
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const valid = user.password_hash === hashPassword(password);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = issueToken(user);

  return res.status(200).json({
    message: 'Login successful',
    token,
    user: sanitizeUser(user)
  });
};

module.exports = {
  signup,
  login
};
