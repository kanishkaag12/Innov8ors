const dotenv = require('dotenv');

dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const app = express();

connectDB();

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

app.get('/', (req, res) => {
  res.json({ message: 'SynapEscrow API running' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SynapEscrow API running' });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));

const PORT = process.env.PORT || 5000;

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
