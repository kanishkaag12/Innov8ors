const express = require('express');
const cors = require('cors');

const projectRoutes = require('./routes/projectRoutes');
const aiRoutes = require('./routes/aiRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const freelancerRoutes = require('./routes/freelancerRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'SynapEscrow backend' });
});

app.use('/api/projects', projectRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/freelancers', freelancerRoutes);
app.use('/api/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({
    message: error.message || 'Internal server error'
  });
});

module.exports = app;
