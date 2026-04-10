const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  createProject,
  listProjects,
  getProjectById,
  getProjectMilestones,
  deleteProject
} = require('../controllers/projectController');
const {
  getRankedFreelancers,
  getFreelancerInsightByProject
} = require('../controllers/mlRankingController');

const router = express.Router();

router.post('/', authenticateToken, createProject);
router.get('/', authenticateToken, listProjects);
router.delete('/:id', authenticateToken, deleteProject);
router.get('/:id/milestones', authenticateToken, getProjectMilestones);
router.get('/:id/interested-freelancers-ranked', authenticateToken, getRankedFreelancers);
router.get('/:id/freelancers/:freelancerId/ml-insight', authenticateToken, getFreelancerInsightByProject);
router.get('/:id', authenticateToken, getProjectById);

module.exports = router;
