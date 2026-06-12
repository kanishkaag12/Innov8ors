const FreelancerMetrics = require('../models/FreelancerMetrics');
const PFIScoreHistory = require('../models/PFIScoreHistory');
const User = require('../models/User');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Submission = require('../models/Submission');
const Payment = require('../models/Payment');
const Proposal = require('../models/Proposal');
const Contract = require('../models/Contract');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

class PFIService {
  // PFI Scoring Weights (total = 100)
  static WEIGHTS = {
    PROFILE_COMPLETENESS: 30,
    PROPOSAL_ACCEPTANCE: 20,
    MILESTONE_COMPLETION: 20,
    ON_TIME_DELIVERY: 15,
    CLIENT_RATINGS: 10,
    PLATFORM_ACTIVITY: 5
  };

  /**
   * Calculate PFI Score for a freelancer
   * @param {string} freelancerId - Freelancer's user ID
   * @param {string} triggerReason - Reason for calculation ('manual_recompute', 'profile_update', etc.)
   * @param {Array} reasonCodes - Array of reason codes for this calculation
   * @param {Object} metadata - Additional metadata
   * @returns {Object} PFI score result
   */
  static async calculatePFIScore(freelancerId, triggerReason = 'manual_recompute', reasonCodes = [], metadata = {}) {
    try {
      // Get or create freelancer metrics
      let metrics = await FreelancerMetrics.findOne({ freelancer_id: freelancerId });
      if (!metrics) {
        metrics = new FreelancerMetrics({ freelancer_id: freelancerId });
      }

      // Update all metrics from database
      await this.updateAllMetrics(freelancerId, metrics);

      // Calculate factor scores
      const factorScores = this.calculateFactorScores(metrics);

      // Calculate final PFI score
      const finalScore = this.calculateFinalScore(factorScores);

      // Update user's PFI score
      await User.findByIdAndUpdate(freelancerId, { pfi_score: Math.round(finalScore) });

      // Save score history
      const historyEntry = new PFIScoreHistory({
        freelancer_id: freelancerId,
        score: Math.round(finalScore),
        factor_breakdown: factorScores,
        triggered_by: triggerReason,
        reason_codes: reasonCodes,
        metadata
      });

      // Get previous score for comparison
      const previousHistory = await PFIScoreHistory.findOne({ freelancer_id: freelancerId })
        .sort({ createdAt: -1 });
      if (previousHistory) {
        historyEntry.previous_score = previousHistory.score;
      }

      await historyEntry.save();
      await metrics.save();

      return {
        score: Math.round(finalScore),
        factor_breakdown: factorScores,
        status: this.getScoreStatus(finalScore, this.isNewFreelancer(metrics)),
        trend: this.calculateTrend(previousHistory?.score, finalScore),
        last_updated: new Date()
      };

    } catch (error) {
      console.error('PFI Score calculation error:', error);
      throw new Error('Failed to calculate PFI score');
    }
  }

  /**
   * Update all metrics from database queries
   */
  static async updateAllMetrics(freelancerId, metrics) {
    // Profile completeness
    metrics.profile_completeness = await this.calculateProfileCompleteness(freelancerId);

    // Verification status
    metrics.verification_status = await this.calculateVerificationStatus(freelancerId);

    // Performance metrics
    metrics.performance_metrics = await this.calculatePerformanceMetrics(freelancerId);

    // Client feedback
    metrics.client_feedback = await this.calculateClientFeedback(freelancerId);

    // Responsiveness
    metrics.responsiveness = await this.calculateResponsiveness(freelancerId);

    // Risk metrics
    metrics.risk_metrics = await this.calculateRiskMetrics(freelancerId);

    return metrics;
  }

  /**
   * Calculate profile completeness score (0-100)
   */
  static async calculateProfileCompleteness(freelancerId) {
    const user = await User.findById(freelancerId);
    if (!user) return { score: 0, last_updated: new Date() };

    let completeness = 0;
    const profile = user.freelancerProfile || {};
    const checks = [
      Boolean(user.name),
      Boolean(user.email),
      Boolean(profile.headline),
      Boolean(profile.bio),
      Boolean(profile.location),
      Boolean(profile.primaryCategory),
      Array.isArray(profile.skills) && profile.skills.length > 0,
      Array.isArray(profile.portfolioLinks) && profile.portfolioLinks.length > 0,
      Array.isArray(profile.languages) && profile.languages.length > 0,
      Boolean(profile.availability)
    ];

    for (const passed of checks) {
      if (passed) completeness += 1;
    }

    const score = (completeness / checks.length) * 100;
    return { score: Math.round(score), last_updated: new Date() };
  }

  /**
   * Calculate verification status score (0-100)
   */
  static async calculateVerificationStatus(freelancerId) {
    const user = await User.findById(freelancerId);
    if (!user) return { github_verified: false, portfolio_verified: false, identity_verified: false, score: 0, last_updated: new Date() };

    // For now, assume verification based on profile data
    // In production, this would check against verification services
    const profile = user.freelancerProfile || {};
    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    const portfolioLinks = Array.isArray(profile.portfolioLinks) ? profile.portfolioLinks : [];

    const githubVerified = portfolioLinks.some((link) => String(link).toLowerCase().includes('github.com'));
    const portfolioVerified = portfolioLinks.length > 0 || Boolean(user.website);
    const identityVerified = Boolean(profile.identityVerified || user.identityVerified);

    const skillVerificationScore = skills.length >= 8 ? 100 : skills.length >= 5 ? 80 : skills.length >= 3 ? 60 : skills.length > 0 ? 40 : 0;
    const identityScore = identityVerified ? 100 : 0;

    let score = 0;
    if (githubVerified) score += 35;
    if (portfolioVerified) score += 25;
    if (identityVerified) score += 40;

    return {
      github_verified: githubVerified,
      portfolio_verified: portfolioVerified,
      identity_verified: identityVerified,
      identity_score: identityScore,
      skill_score: skillVerificationScore,
      score,
      last_updated: new Date()
    };
  }

  /**
   * Calculate performance metrics
   */
  static async calculatePerformanceMetrics(freelancerId) {
    const [
      totalProposals,
      acceptedProposals,
      contracts
    ] = await Promise.all([
      Proposal.countDocuments({ freelancerId }),
      Proposal.countDocuments({ freelancerId, status: 'accepted' }),
      Contract.find({ freelancerId }).select('projectId status').lean()
    ]);

    const acceptedProjects = contracts
      .filter((contract) => String(contract.status || '').toLowerCase() !== 'cancelled')
      .map((contract) => String(contract.projectId || '').trim())
      .filter(Boolean);

    if (acceptedProjects.length === 0) {
      return {
        total_proposals: totalProposals,
        accepted_proposals: acceptedProposals,
        proposal_acceptance_rate: totalProposals > 0 ? Math.round((acceptedProposals / totalProposals) * 100) : 0,
        total_milestones: 0,
        completed_milestones: 0,
        milestone_completion_rate: 0,
        on_time_deliveries: 0,
        total_deliveries: 0,
        on_time_delivery_rate: 0,
        last_updated: new Date()
      };
    }

    const proposalAcceptanceRate = totalProposals > 0 ? (acceptedProposals / totalProposals) * 100 : 0;

    const milestones = await Milestone.find({ project_id: { $in: acceptedProjects } }).lean();
    const completedMilestones = milestones.filter(
      (milestone) =>
        String(milestone.status || '').toLowerCase() === 'completed' ||
        String(milestone.payment_status || '').toLowerCase() === 'paid'
    ).length;
    const milestoneCompletionRate = milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0;

    const submissions = await Submission.find({ freelancer_id: freelancerId }).lean();
    const onTimeDeliveries = Math.min(submissions.length, completedMilestones);
    const onTimeDeliveryRate = completedMilestones > 0 ? (onTimeDeliveries / completedMilestones) * 100 : 0;

    return {
      total_proposals: totalProposals,
      accepted_proposals: acceptedProposals,
      proposal_acceptance_rate: Math.round(proposalAcceptanceRate),
      total_milestones: milestones.length,
      completed_milestones: completedMilestones,
      milestone_completion_rate: Math.round(milestoneCompletionRate),
      on_time_deliveries: onTimeDeliveries,
      total_deliveries: submissions.length,
      on_time_delivery_rate: Math.round(onTimeDeliveryRate),
      last_updated: new Date()
    };
  }

  /**
   * Calculate client feedback metrics
   */
  static async calculateClientFeedback(freelancerId) {
    const contracts = await Contract.find({ freelancerId, status: 'completed' }).select('employerId').lean();

    const employerCounts = contracts.reduce((acc, contract) => {
      const key = String(contract.employerId || '');
      if (!key) return acc;
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map());

    const rehiredEmployers = Array.from(employerCounts.values()).filter((count) => count > 1).length;
    const rehireRate = contracts.length > 0 ? Math.round((rehiredEmployers / contracts.length) * 100) : 0;

    return {
      total_ratings: 0,
      average_rating: 0,
      total_reviews: 0,
      positive_reviews: 0,
      review_sentiment_score: 0,
      total_rehires: rehiredEmployers,
      rehire_rate: rehireRate,
      last_updated: new Date()
    };
  }

  /**
   * Calculate responsiveness score
   */
  static async calculateResponsiveness(freelancerId) {
    const conversations = await Conversation.find({ participants: freelancerId }).select('_id').lean();
    const conversationIds = conversations.map((conversation) => conversation._id);

    if (!conversationIds.length) {
      return {
        average_response_time_hours: null,
        response_rate: 0,
        score: 0,
        last_updated: new Date()
      };
    }

    const [incomingMessages, sentMessages] = await Promise.all([
      Message.countDocuments({ conversationId: { $in: conversationIds }, senderId: { $ne: freelancerId } }),
      Message.countDocuments({ conversationId: { $in: conversationIds }, senderId: freelancerId })
    ]);

    const responseRate = incomingMessages > 0 ? Math.min(100, Math.round((sentMessages / incomingMessages) * 100)) : 100;

    return {
      average_response_time_hours: null,
      response_rate: responseRate,
      score: responseRate,
      last_updated: new Date()
    };
  }

  /**
   * Calculate risk metrics (penalties)
   */
  static async calculateRiskMetrics(freelancerId) {
    // Check for failed payments/refunds
    const payments = await Payment.find({
      // Would need to link payments to freelancer
      // For now, assume no disputes
    });

    return {
      total_disputes: 0,
      active_disputes: 0,
      refunds_processed: 0,
      failed_escrows: 0,
      penalty_score: 0, // 0 = no penalty
      last_updated: new Date()
    };
  }

  /**
   * Calculate individual factor scores (0-100)
   */
  static calculateFactorScores(metrics) {
    return {
      profile_completeness: Number(metrics.profile_completeness.score || 0),
      proposal_acceptance: Number(metrics.performance_metrics.proposal_acceptance_rate || 0),
      milestone_completion: Number(metrics.performance_metrics.milestone_completion_rate || 0),
      on_time_delivery: Number(metrics.performance_metrics.on_time_delivery_rate || 0),
      client_ratings: Math.round((Number(metrics.client_feedback.average_rating || 0) / 5) * 100),
      platform_activity: Number(metrics.responsiveness.response_rate || 0)
    };
  }

  /**
   * Calculate final PFI score using weighted average
   */
  static calculateFinalScore(factorScores) {
    const weights = this.WEIGHTS;

    let totalScore = 0;

    // Add positive factors
    totalScore += (factorScores.profile_completeness * weights.PROFILE_COMPLETENESS);
    totalScore += (factorScores.proposal_acceptance * weights.PROPOSAL_ACCEPTANCE);
    totalScore += (factorScores.milestone_completion * weights.MILESTONE_COMPLETION);
    totalScore += (factorScores.on_time_delivery * weights.ON_TIME_DELIVERY);
    totalScore += (factorScores.client_ratings * weights.CLIENT_RATINGS);
    totalScore += (factorScores.platform_activity * weights.PLATFORM_ACTIVITY);

    const finalScore = totalScore / 100;

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, finalScore));
  }

  /**
   * Get status label based on score
   */
  static getScoreStatus(score, isGettingStarted = false) {
    if (isGettingStarted) return 'Getting Started';
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Needs Improvement';
    return 'Poor';
  }

  /**
   * Calculate trend compared to previous score
   */
  static calculateTrend(previousScore, currentScore) {
    if (!previousScore) return 'new';
    if (currentScore > previousScore) return 'up';
    if (currentScore < previousScore) return 'down';
    return 'stable';
  }

  /**
   * Get PFI score and breakdown for a freelancer
   */
  static async getPFIScore(freelancerId) {
    const user = await User.findById(freelancerId);
    if (!user) throw new Error('Freelancer not found');

    const history = await PFIScoreHistory.findOne({ freelancer_id: freelancerId })
      .sort({ createdAt: -1 });

    if (!history) {
      // Calculate score if not exists
      return await this.calculatePFIScore(freelancerId);
    }

    return {
      score: history.score,
      factor_breakdown: history.factor_breakdown,
      status: this.getScoreStatus(
        history.score,
        Number(history?.factor_breakdown?.proposal_acceptance || 0) === 0 &&
          Number(history?.factor_breakdown?.milestone_completion || 0) === 0 &&
          Number(history?.factor_breakdown?.client_ratings || 0) === 0
      ),
      trend: this.calculateTrend(history.previous_score, history.score),
      last_updated: history.createdAt
    };
  }

  static isNewFreelancer(metrics) {
    return (
      Number(metrics?.performance_metrics?.total_proposals || 0) === 0 &&
      Number(metrics?.performance_metrics?.total_milestones || 0) === 0 &&
      Number(metrics?.client_feedback?.total_ratings || 0) === 0
    );
  }

  /**
   * Get PFI score history for a freelancer
   */
  static async getPFIHistory(freelancerId, limit = 10) {
    return await PFIScoreHistory.find({ freelancer_id: freelancerId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * New calculatePFI utility that returns structured output
   */
  static async calculatePFI(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('Freelancer not found');

    // Always recompute fresh data for AI usage
    const pfiData = await this.calculatePFIScore(userId, 'manual_recompute');
    const breakdown = {
      profile: Number(pfiData.factor_breakdown.profile_completeness || 0),
      proposals: Number(pfiData.factor_breakdown.proposal_acceptance || 0),
      milestones: Number(pfiData.factor_breakdown.milestone_completion || 0),
      delivery: Number(pfiData.factor_breakdown.on_time_delivery || 0),
      ratings: Number(pfiData.factor_breakdown.client_ratings || 0),
      activity: Number(pfiData.factor_breakdown.platform_activity || 0)
    };

    const recommendations = [];

    // Missing profile fields
    const missingFields = [];
    const profile = user.freelancerProfile || {};
    if (!user.name) missingFields.push('name');
    if (!profile.headline) missingFields.push('headline');
    if (!profile.bio) missingFields.push('bio');
    if (!profile.location) missingFields.push('location');
    if (!profile.primaryCategory) missingFields.push('primary category');
    if (!profile.portfolioLinks || profile.portfolioLinks.length === 0) missingFields.push('portfolio links');
    if (!Array.isArray(profile.languages) || profile.languages.length === 0) missingFields.push('languages');
    if (missingFields.length > 0) {
      recommendations.push(`Complete your profile — missing: ${missingFields.join(', ')}.`);
    }

    // Missing skills
    const skillsCount = Array.isArray(profile.skills) ? profile.skills.length : 0;
    if (skillsCount === 0) {
      recommendations.push('Add your core skills to your profile so clients can find you and improve your job match score.');
    } else if (skillsCount < 3) {
      recommendations.push(`You have ${skillsCount} skill${skillsCount === 1 ? '' : 's'} listed. Add at least 3 service-specific skills to unlock better job matches.`);
    } else if (skillsCount < 6) {
      recommendations.push(`Consider adding more skills (you have ${skillsCount}). Freelancers with 6+ skills get significantly more matches.`);
    }

    // Proposal acceptance rate
    if (breakdown.proposals === 0) {
      recommendations.push('Apply to your first job! Browse recommended jobs below and send a tailored proposal to get started.');
    } else if (breakdown.proposals < 20) {
      recommendations.push(`Your proposal acceptance rate is low (${breakdown.proposals}%). Open with a quantified result from past work and reference the client's scope directly.`);
    } else if (breakdown.proposals < 40) {
      recommendations.push(`Your proposal acceptance rate is ${breakdown.proposals}%. Try referencing the client's project scope in your first 2 lines to stand out.`);
    }

    // Milestone completion rate
    if (breakdown.milestones > 0 && breakdown.milestones < 60) {
      recommendations.push(`Your milestone completion rate is ${breakdown.milestones}%. Break deliverables into smaller tasks to increase approval rates.`);
    } else if (breakdown.milestones >= 60 && breakdown.milestones < 80) {
      recommendations.push(`Your milestone completion rate is ${breakdown.milestones}%. Focus on clearly defined deliverables and communicate early if scope changes.`);
    }

    // Delivery performance
    if (breakdown.delivery > 0 && breakdown.delivery < 70) {
      recommendations.push(`Your on-time delivery rate is ${breakdown.delivery}%. Propose realistic timelines and flag delays proactively to protect your rating.`);
    } else if (breakdown.delivery >= 70 && breakdown.delivery < 90) {
      recommendations.push(`Your on-time delivery rate is ${breakdown.delivery}%. Add buffer time to your estimates to consistently meet deadlines.`);
    }

    // Platform activity
    if (breakdown.activity < 50) {
      recommendations.push('Boost your platform activity by responding to messages promptly — aim to reply within 24 hours.');
    }

    // Fallback if no recommendations
    if (recommendations.length === 0) {
      recommendations.push('Excellent work! Keep applying to jobs and maintaining your high delivery and ratings streak.');
    }

    return {
      score: pfiData.score,
      breakdown,
      recommendations
    };
  }

  /**
   * Get improvement suggestions (legacy — kept for backwards compatibility)
   */
  static getImprovementSuggestions(factorBreakdown) {
    const suggestions = [];

    if ((factorBreakdown.profile_completeness || 0) < 80) {
      suggestions.push({
        factor: 'profile_completeness',
        title: 'Complete your profile',
        description: 'Add your skills, portfolio, and company information to improve your score.',
        impact: 'High'
      });
    }

    if ((factorBreakdown.proposal_acceptance || 0) < 50) {
      suggestions.push({
        factor: 'proposal_acceptance',
        title: 'Improve Proposal Success',
        description: 'Refine your pitch to increase your proposal acceptance rate.',
        impact: 'High'
      });
    }

    return suggestions;
  }
}

module.exports = PFIService;