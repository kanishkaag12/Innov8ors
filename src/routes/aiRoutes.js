const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const {
  generateMilestones,
  verifyMilestone
} = require('../controllers/aiController');

const router = express.Router();

router.post('/generate-milestones', asyncHandler(generateMilestones));
router.post('/verify-milestone', asyncHandler(verifyMilestone));

module.exports = router;
