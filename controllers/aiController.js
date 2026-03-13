const { generateMilestones } = require("../services/aiService");

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
      milestones: result
    });

  } catch (error) {

    console.error("AI ANALYZER ERROR:", error);

    res.status(500).json({
      error: "AI analysis failed"
    });

  }

}

module.exports = { analyzeRequirement };