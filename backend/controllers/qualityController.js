const { getRepoCode } = require("../services/githubService");
const { analyzeCode } = require("../services/qualityService");

async function verifyMilestone(req, res) {

  try {

    const { repoLink, milestone, projectTitle } = req.body;

    if (!repoLink || !milestone) {
      return res.status(400).json({
        error: "repoLink and milestone required"
      });
    }

    const repoData = await getRepoCode(repoLink, milestone, projectTitle);

    const result = await analyzeCode(milestone, repoData.code, projectTitle);

    return res.json({
      success: true,
      result: {
        ...result,
        metadata: {
          filesScanned: repoData.filesScanned,
          filesAnalyzed: repoData.filesAnalyzed
        }
      }
    });

  } catch (error) {

    console.error("QUALITY CHECK ERROR:", error);
    const message = (error && error.message) ? error.message : "Quality check failed";

    if (
      message.includes("Invalid GitHub repository URL") ||
      message.includes("GitHub repository not found") ||
      message.includes("no supported code files")
    ) {
      return res.status(400).json({
        error: message,
        result: {
          status: "Unmet",
          completion_percentage: 0,
          short_explanation: message,
          assessment:
            "The repository link is invalid or does not contain verifiable code for this milestone.",
          recommended_action: "Initiate employer refund protocol"
        }
      });
    }

    return res.status(500).json({
      error: message
    });

  }

}

module.exports = { verifyMilestone };
