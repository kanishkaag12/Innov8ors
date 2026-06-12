const { generateMilestones, generateProposal } = require("../services/aiService");
const { chatWithSynapBot } = require("../services/synapbot/synapbotService");
const Project = require("../models/Project");

async function analyzeRequirement(req, res) {

  try {

    const { description, project_id } = req.body || {};
    let projectDescription = String(description || '').trim();

    if (!projectDescription && project_id) {
      const project = await Project.findById(project_id).select('title description').lean();

      if (!project) {
        return res.status(404).json({
          error: "Project not found"
        });
      }

      projectDescription = [project.title, project.description].filter(Boolean).join('\n\n');
    }

    if (!projectDescription) {
      return res.status(400).json({
        error: "Project description required"
      });
    }

    const result = await generateMilestones(projectDescription);

    res.json({
      success: true,
      project_title: result.project_title,
      milestones: result.milestones
    });

  } catch (error) {

    console.error("AI ANALYZER ERROR:", error);

    res.status(500).json({
      error: "AI analysis failed",
      details: error.message
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

    // Optionally decode authentication token to provide user-specific tool integration
    let user = null;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const User = require('../models/User');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        user = await User.findById(decoded.id);
        if (user) {
          console.log(`👤 Decoded user context for SynapBot: ${user.email} (${user.role})`);
        }
      } catch (e) {
        console.log("⚠️ SynapBot auth token decode failed:", e.message);
      }
    }

    console.log(`🧠 SynapBot request: "${String(message).substring(0, 60)}..."`);
    const result = await chatWithSynapBot({
      message,
      history: history || [],
      user
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
