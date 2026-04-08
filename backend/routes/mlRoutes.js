const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { recomputeProjectRanking } = require('../controllers/mlRankingController');

const router = express.Router();

router.post('/recompute-ranking/:projectId', authenticateToken, recomputeProjectRanking);

module.exports = router;
