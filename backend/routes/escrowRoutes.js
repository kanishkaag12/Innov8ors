const express = require('express');
const router = express.Router();
const escrowController = require('../controllers/escrowController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/create', authenticateToken, escrowController.createEscrow);
router.post('/release-partial', authenticateToken, escrowController.releasePartial);
router.post('/request-partial', authenticateToken, escrowController.requestPartial);
router.post('/approve-partial', authenticateToken, escrowController.approvePartial);
router.post('/reject-partial', authenticateToken, escrowController.rejectPartial);
router.post('/release-full', authenticateToken, escrowController.releaseFull);
router.post('/refund', authenticateToken, escrowController.refundEscrow);
router.get('/wallet/:userId', authenticateToken, escrowController.getWallet);
router.get('/transactions/:userId', authenticateToken, escrowController.getTransactions);

module.exports = router;
