const { generateMilestones, generateProposal } = require("../services/aiService");

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

module.exports = { analyzeRequirement, generateProposalController };
