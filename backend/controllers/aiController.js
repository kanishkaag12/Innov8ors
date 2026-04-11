const { generateMilestones, generateProposal, chatWithAI } = require("../services/aiService");

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
    const { message, history, role, page, context: pageContext } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const systemContext = `
The user is currently a ${role || 'Guest'} browsing the ${page || 'unknown'} page.
Additional page context: ${pageContext || 'None'}.
`;

    console.log(`🧠 AI is thinking about message: "${message.substring(0, 30)}..." for role: ${role}`);
    const reply = await chatWithAI(message, history || [], systemContext);
    console.log(`✅ AI Response generated: ${reply.substring(0, 50)}...`);

    res.json({
      success: true,
      reply
    });

  } catch (error) {
    console.error("❌ CHATBOT CONTROLLER ERROR:", error.message);
    if (error.status) console.error("Error Status:", error.status);
    
    res.status(500).json({
      error: "Chatbot service failed",
      details: error.message
    });
  }
}

module.exports = { analyzeRequirement, generateProposalController, chatBotController };
