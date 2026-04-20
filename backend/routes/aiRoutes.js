const express = require("express");

const { analyzeRequirement, generateProposalController, chatBotController } = require("../controllers/aiController");
const { verifyMilestone } = require("../controllers/qualityController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

/* requirement analyzer */
router.post("/generate-milestones", analyzeRequirement);

/* generate proposal */
router.post("/generate-proposal", authenticateToken, generateProposalController);

/* github repo code analyzer */
router.post("/verify-milestone", verifyMilestone);

/* SynapBot platform support assistant */
router.post("/synapbot/chat", chatBotController);

module.exports = router;
