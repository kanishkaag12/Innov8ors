const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const {
	submitMilestoneWork,
	getMilestonesByProject,
	getMilestonesByFreelancer
} = require('../controllers/milestoneController');

const router = express.Router();

router.post('/:id/submit', asyncHandler(submitMilestoneWork));
router.get('/project/:projectId', asyncHandler(getMilestonesByProject));
router.get('/freelancer/:freelancerId', asyncHandler(getMilestonesByFreelancer));

module.exports = router;
