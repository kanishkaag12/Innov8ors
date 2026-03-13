const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { getPFI } = require('../controllers/freelancerController');

const router = express.Router();

router.get('/:id/pfi', asyncHandler(getPFI));

module.exports = router;
