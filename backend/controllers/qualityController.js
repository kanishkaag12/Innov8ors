const { getRepoCode } = require("../services/githubService");
const { analyzeCode } = require("../services/qualityService");
const mongoose = require('mongoose');
const User = require('../models/User');
const Escrow = require('../models/Escrow');
const Transaction = require('../models/Transaction');
const Milestone = require('../models/Milestone');
const Project = require('../models/Project');

async function verifyMilestone(req, res) {

  try {

    const { repoLink, milestone, projectTitle, projectId, milestoneId } = req.body;

    if (!repoLink || !milestone) {
      return res.status(400).json({
        error: "repoLink and milestone required"
      });
    }

    if (milestoneId) {
      const existingMilestone = await Milestone.findById(milestoneId);
      if (existingMilestone) {
        if (existingMilestone.payment_status === 'paid' || existingMilestone.status === 'completed') {
          return res.status(400).json({
            error: "This milestone is already fully completed and paid."
          });
        }
        if (existingMilestone.payment_status === 'requested') {
          return res.status(400).json({
            error: "A quality verification check has already been run and is pending approval from the client."
          });
        }
      }
    }

    const repoData = await getRepoCode(repoLink, milestone, projectTitle);

    const result = await analyzeCode(milestone, repoData.code, projectTitle);

    // Dynamic database update logic
    if (projectId && milestoneId && result.status) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const milestoneObj = await Milestone.findById(milestoneId).session(session);
        if (milestoneObj) {
          if (result.status === "Fully Completed") {
            const escrow = await Escrow.findOne({ projectId }).session(session);
            if (escrow) {
              const amountToRelease = milestoneObj.amount_remaining || milestoneObj.payment_amount;

              if (amountToRelease > 0 && amountToRelease <= escrow.remainingAmount + 0.01) {
                const client = await User.findById(escrow.clientId).session(session);
                const freelancer = await User.findById(escrow.freelancerId).session(session);

                if (client && freelancer) {
                  // Update balances
                  client.escrowLocked = Math.max(0, Number((client.escrowLocked - amountToRelease).toFixed(2)));
                  freelancer.balance = Number((freelancer.balance + amountToRelease).toFixed(2));

                  // Update escrow container
                  escrow.releasedAmount = Number((escrow.releasedAmount + amountToRelease).toFixed(2));
                  escrow.remainingAmount = Math.max(0, Number((escrow.remainingAmount - amountToRelease).toFixed(2)));
                  escrow.status = escrow.remainingAmount > 0.01 ? 'PARTIAL' : 'RELEASED';

                  // Update Milestone payout
                  milestoneObj.amount_paid = Number(((milestoneObj.amount_paid || 0) + amountToRelease).toFixed(2));
                  milestoneObj.amount_remaining = 0;
                  milestoneObj.payment_status = 'paid';
                  milestoneObj.status = 'completed';
                  milestoneObj.completion_percentage = 100;

                  await client.save({ session });
                  await freelancer.save({ session });
                  await escrow.save({ session });
                  await milestoneObj.save({ session });

                  // Audit ledger transactions
                  await new Transaction({
                    userId: client._id,
                    type: 'debit',
                    amount: amountToRelease,
                    referenceId: escrow._id,
                    description: `Auto Escrow release (100% verified) for Project ${escrow.projectId} - Milestone: ${milestoneObj.title}`
                  }).save({ session });

                  await new Transaction({
                    userId: freelancer._id,
                    type: 'credit',
                    amount: amountToRelease,
                    referenceId: escrow._id,
                    description: `Payment received (100% verified) for Project ${escrow.projectId} - Milestone: ${milestoneObj.title}`
                  }).save({ session });
                }
              }
            }
          } else if (result.status === "Partially Completed") {
            const currentPercentage = milestoneObj.completion_percentage || 0;
            const newPercentage = result.completion_percentage || 55;

            if (newPercentage <= currentPercentage && milestoneObj.amount_paid > 0) {
              await session.abortTransaction();
              session.endSession();
              return res.status(400).json({
                error: `Quality check returned ${newPercentage}% completion, which does not exceed the previously paid level of ${currentPercentage}%. No new payment requested.`,
                result: {
                  ...result,
                  status: "Unmet",
                  completion_percentage: newPercentage,
                  short_explanation: `No progress made. Code quality is at ${newPercentage}%, which is at or below the previously paid level of ${currentPercentage}%.`
                }
              });
            }

            milestoneObj.status = 'submitted';
            milestoneObj.payment_status = 'requested';
            milestoneObj.completion_percentage = newPercentage;
            await milestoneObj.save({ session });
          } else {
            milestoneObj.status = 'pending';
            milestoneObj.payment_status = 'rejected';
            await milestoneObj.save({ session });
          }
        }
        await session.commitTransaction();
        session.endSession();
      } catch (dbError) {
        await session.abortTransaction();
        session.endSession();
        console.error("Database update transaction failed during quality verification:", dbError);
      }
    }

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
