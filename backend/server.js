const dotenv = require('dotenv');

dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const app = express();

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002'
    ],
    credentials: true
  })
);
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`📡 ${req.method.toUpperCase()} ${req.path}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'SynapEscrow API running' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SynapEscrow API running' });
});

// DEBUG ENDPOINT: List all conversations
app.get('/debug/conversations', async (req, res) => {
  try {
    const Conversation = require('./models/Conversation');
    const conversations = await Conversation.find({}).populate('participants', 'name email role');
    console.log('🔍 DEBUG: Found', conversations.length, 'conversations');
    res.json({ count: conversations.length, conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG ENDPOINT: List all proposals  
app.get('/debug/proposals', async (req, res) => {
  try {
    const Proposal = require('./models/Proposal');
    const proposals = await Proposal.find({}).populate('freelancerId', 'name email').populate('employerId', 'name email');
    console.log('🔍 DEBUG: Found', proposals.length, 'proposals');
    res.json({ count: proposals.length, proposals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/freelancers', require('./routes/pfiRoutes'));
app.use('/api/proposals', require('./routes/proposalRoutes'));
app.use('/api/conversations', require('./routes/conversationRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/ml', require('./routes/mlRoutes'));

// DEBUG ENDPOINT: List freelancers and jobs
app.get('/debug/jobs-data', async (req, res) => {
  try {
    const User = require('./models/User');
    const Job = require('./models/Job');
    const freelancers = await User.find({ role: 'freelancer' }).select('_id name email freelancerProfile');
    const jobs = await Job.find({}).select('_id title category budgetMin budgetMax');
    res.json({
      freelancers: freelancers.map(f => ({
        id: f._id,
        name: f.name,
        email: f.email,
        skills: f.freelancerProfile?.skills,
        hasEmbedding: !!f.freelancerProfile?.profileEmbedding
      })),
      jobs: jobs.map(j => ({
        id: j._id,
        title: j.title,
        category: j.category,
        budget: `$${j.budgetMin}-${j.budgetMax}`
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the existing backend process or run with a different PORT.`);
      process.exit(1);
    }

    console.error('Server failed to start:', error);
    process.exit(1);
  });
};

startServer();
