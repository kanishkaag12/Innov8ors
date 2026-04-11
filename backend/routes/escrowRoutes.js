const express = require('express');
const router = express.Router();
const escrowController = require('../controllers/escrowController');
// const { protect } = require('../middleware/authMiddleware'); // assumed auth middleware exists, can be plugged in later

// For now, no auth middleware applied explicitly to keep it simple and runnable for demo
router.post('/create', escrowController.createEscrow);
router.post('/release-partial', escrowController.releasePartial);
router.post('/request-partial', escrowController.requestPartial);
router.post('/approve-partial', escrowController.approvePartial);
router.post('/reject-partial', escrowController.rejectPartial);
router.post('/release-full', escrowController.releaseFull);
router.post('/refund', escrowController.refundEscrow);
router.get('/wallet/:userId', escrowController.getWallet);
router.get('/transactions/:userId', escrowController.getTransactions);

module.exports = router;
