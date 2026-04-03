const { getRepoCode } = require("../services/githubService");
const { analyzeCode } = require("../services/qualityService");

async function verifyMilestone(req, res) {

  try {

    const { repoLink, milestone } = req.body;

    if (!repoLink || !milestone) {
      return res.status(400).json({
        error: "repoLink and milestone required"
      });
    }

    const repoCode = await getRepoCode(repoLink);

    const result = await analyzeCode(milestone, repoCode);

    res.json({
      success: true,
      result
    });

  } catch (error) {

    console.error("QUALITY CHECK ERROR:", error);

    res.status(500).json({
      error: "Quality check failed"
    });

  }

}

module.exports = { verifyMilestone };
