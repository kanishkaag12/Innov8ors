const { generateMilestones, generateProposal } = require("../services/aiService");
const { chatWithSynapBot } = require("../services/synapbot/synapbotService");

async function analyzeRequirement(req, res) {

  try {

    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        error: "Project description required"
      });
    }

    const result = await generateMilestones(description);

    res.json({
      success: true,
      project_title: result.project_title,
      milestones: result.milestones
    });

  } catch (error) {

    console.error("AI ANALYZER ERROR:", error);

    res.status(500).json({
      error: "AI analysis failed"
    });

  }

}

async function generateProposalController(req, res) {
  try {
    const { job, freelancerProfile, freelancerName } = req.body;

    if (!job || !freelancerProfile) {
      return res.status(400).json({
        error: "Job and freelancer profile required"
      });
    }

    const proposal = await generateProposal(job, {
      ...freelancerProfile,
      name: freelancerName || freelancerProfile?.name || req.user?.name
    });

    res.json({
      success: true,
      proposal
    });

  } catch (error) {
    console.error("PROPOSAL GENERATION ERROR:", error);
    res.status(500).json({
      error: "Proposal generation failed"
    });
  }
}

async function chatBotController(req, res) {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    console.log(`🧠 SynapBot request: "${String(message).substring(0, 60)}..."`);
    const result = await chatWithSynapBot({
      message,
      history: history || []
    });

    res.json({
      success: true,
      reply: result.reply,
      contextUsed: result.contextUsed || [],
      toolsAvailable: result.toolsAvailable || []
    });

  } catch (error) {
    console.error("❌ SYNAPBOT CONTROLLER ERROR:", error.message);
    if (error.status) console.error("Error Status:", error.status);

    const statusCode =
      error.code === "INVALID_MESSAGE"
        ? 400
        : error.code === "MISSING_GEMINI_API_KEY"
          ? 503
          : 500;
    
    res.status(statusCode).json({
      error: "SynapBot service failed",
      details: error.message
    });
  }
}

module.exports = { analyzeRequirement, generateProposalController, chatBotController };
