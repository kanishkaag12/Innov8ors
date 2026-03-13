const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const {
	createProject,
	listProjects,
	getProjectById,
	getProjectMilestones,
	approveMilestones
} = require('../controllers/projectController');

const router = express.Router();

router.get('/', asyncHandler(listProjects));
router.post('/', asyncHandler(createProject));
router.get('/:id', asyncHandler(getProjectById));
router.get('/:id/milestones', asyncHandler(getProjectMilestones));
router.post('/:id/milestones/approval', asyncHandler(approveMilestones));

module.exports = router;
