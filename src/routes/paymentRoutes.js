const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const {
	releasePayment,
	getPaymentsByProject,
	getEscrowDashboard
} = require('../controllers/paymentController');

const router = express.Router();

router.post('/release', asyncHandler(releasePayment));
router.get('/project/:projectId', asyncHandler(getPaymentsByProject));
router.get('/project/:projectId/dashboard', asyncHandler(getEscrowDashboard));

module.exports = router;
