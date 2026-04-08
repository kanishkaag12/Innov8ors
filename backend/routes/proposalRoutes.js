const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, proposalController.createProposal);
router.get('/me', authenticateToken, proposalController.getMyProposals);
router.post('/:id/accept', authenticateToken, proposalController.acceptProposal);
router.post('/:id/reject', authenticateToken, proposalController.rejectProposal);

module.exports = router;
