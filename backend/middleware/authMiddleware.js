const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    console.log('🔐 Auth middleware - checking request:', req.method, req.path);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth middleware - missing authorization header');
      return res.status(401).json({ message: 'Authorization token missing' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'secret123';

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
      console.log('✅ Auth middleware - token verified for user:', decoded.id, 'role:', decoded.role);
    } catch (error) {
      console.log('❌ Auth middleware - token verification failed:', error.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('❌ Auth middleware - user not found:', decoded.id);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('✅ Auth middleware - user authenticated:', user._id, 'role:', user.role);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    return res.status(500).json({ message: 'Authentication failure', error: error.message });
  }
};

module.exports = {
  authenticateToken
};
