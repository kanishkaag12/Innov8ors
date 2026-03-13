const express = require("express");

const { analyzeRequirement } = require("../controllers/aiController");
const { verifyMilestone } = require("../controllers/qualityController");

const router = express.Router();

/* requirement analyzer */
router.post("/generate-milestones", analyzeRequirement);

/* github repo code analyzer */
router.post("/verify-milestone", verifyMilestone);

module.exports = router;