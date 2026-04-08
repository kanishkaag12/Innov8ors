const FreelancerMetrics = require('../models/FreelancerMetrics');
const PFIScoreHistory = require('../models/PFIScoreHistory');
const User = require('../models/User');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Submission = require('../models/Submission');
const Payment = require('../models/Payment');

class PFIService {
  // PFI Scoring Weights (total = 100)
  static WEIGHTS = {
    PROFILE_COMPLETENESS: 20,
    VERIFICATION: 15,
    PROPOSAL_ACCEPTANCE: 10,
    MILESTONE_COMPLETION: 20,
    ON_TIME_DELIVERY: 15,
    CLIENT_RATINGS: 10,
    REVIEW_SENTIMENT: 5,
    REHIRE_RATE: 10,
    RESPONSIVENESS: 10,
    RISK_PENALTY: -25 // negative weight = penalty
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
        status: this.getScoreStatus(finalScore),
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
    const totalFields = 6;

    // Basic profile fields
    if (user.name) completeness += 1;
    if (user.email) completeness += 1;

    // Freelancer profile fields
    if (user.freelancerProfile?.category) completeness += 1;
    if (user.freelancerProfile?.skills?.length > 0) completeness += 1;
    if (user.companyName) completeness += 1;
    if (user.website) completeness += 1;

    const score = (completeness / totalFields) * 100;
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
    const githubVerified = user.freelancerProfile?.githubLink ? true : false;
    const portfolioVerified = user.website ? true : false;
    const identityVerified = false; // Would require KYC integration

    let score = 0;
    if (githubVerified) score += 40;
    if (portfolioVerified) score += 30;
    if (identityVerified) score += 30;

    return {
      github_verified: githubVerified,
      portfolio_verified: portfolioVerified,
      identity_verified: identityVerified,
      score,
      last_updated: new Date()
    };
  }

  /**
   * Calculate performance metrics
   */
  static async calculatePerformanceMetrics(freelancerId) {
    // Get all projects where freelancer is assigned
    const projects = await Project.find({ freelancer_id: freelancerId });

    if (projects.length === 0) {
      return {
        total_proposals: 0,
        accepted_proposals: 0,
        proposal_acceptance_rate: 0,
        total_milestones: 0,
        completed_milestones: 0,
        milestone_completion_rate: 0,
        on_time_deliveries: 0,
        total_deliveries: 0,
        on_time_delivery_rate: 0,
        last_updated: new Date()
      };
    }

    // For now, assume all assigned projects = accepted proposals
    // In production, you'd track actual proposals vs acceptances
    const totalProposals = projects.length;
    const acceptedProposals = projects.length;
    const proposalAcceptanceRate = totalProposals > 0 ? (acceptedProposals / totalProposals) * 100 : 0;

    // Milestone metrics
    const projectIds = projects.map(p => p._id);
    const milestones = await Milestone.find({ project_id: { $in: projectIds } });
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const milestoneCompletionRate = milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0;

    // On-time delivery (simplified - would need deadline tracking)
    const submissions = await Submission.find({ freelancer_id: freelancerId });
    const onTimeDeliveries = submissions.length; // Assume all on time for now
    const onTimeDeliveryRate = submissions.length > 0 ? 100 : 0; // Simplified

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
    // For now, return default values
    // In production, you'd have a Reviews/Ratings model
    return {
      total_ratings: 0,
      average_rating: 0,
      total_reviews: 0,
      positive_reviews: 0,
      review_sentiment_score: 50, // Neutral
      total_rehires: 0,
      rehire_rate: 0,
      last_updated: new Date()
    };
  }

  /**
   * Calculate responsiveness score
   */
  static async calculateResponsiveness(freelancerId) {
    // For now, return default values
    // In production, you'd track response times to messages/queries
    return {
      average_response_time_hours: 24,
      response_rate: 80,
      score: 70, // 70% responsiveness score
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
      profile_completeness: metrics.profile_completeness.score,
      verification: metrics.verification_status.score,
      proposal_acceptance: metrics.performance_metrics.proposal_acceptance_rate,
      milestone_completion: metrics.performance_metrics.milestone_completion_rate,
      on_time_delivery: metrics.performance_metrics.on_time_delivery_rate,
      client_ratings: Math.round((metrics.client_feedback.average_rating / 5) * 100), // Convert 5-star to percentage
      review_sentiment: metrics.client_feedback.review_sentiment_score,
      rehire_rate: metrics.client_feedback.rehire_rate,
      responsiveness: metrics.responsiveness.score,
      risk_penalty: metrics.risk_metrics.penalty_score
    };
  }

  /**
   * Calculate final PFI score using weighted average
   */
  static calculateFinalScore(factorScores) {
    const weights = this.WEIGHTS;

    let totalScore = 0;
    let totalWeight = 0;

    // Add positive factors
    totalScore += (factorScores.profile_completeness * weights.PROFILE_COMPLETENESS);
    totalScore += (factorScores.verification * weights.VERIFICATION);
    totalScore += (factorScores.proposal_acceptance * weights.PROPOSAL_ACCEPTANCE);
    totalScore += (factorScores.milestone_completion * weights.MILESTONE_COMPLETION);
    totalScore += (factorScores.on_time_delivery * weights.ON_TIME_DELIVERY);
    totalScore += (factorScores.client_ratings * weights.CLIENT_RATINGS);
    totalScore += (factorScores.review_sentiment * weights.REVIEW_SENTIMENT);
    totalScore += (factorScores.rehire_rate * weights.REHIRE_RATE);
    totalScore += (factorScores.responsiveness * weights.RESPONSIVENESS);

    // Apply penalty score as a reduction
    totalScore += (factorScores.risk_penalty * weights.RISK_PENALTY);

    // Calculate total weight (excluding penalty since it's negative)
    totalWeight = weights.PROFILE_COMPLETENESS + weights.VERIFICATION + weights.PROPOSAL_ACCEPTANCE +
                  weights.MILESTONE_COMPLETION + weights.ON_TIME_DELIVERY + weights.CLIENT_RATINGS +
                  weights.REVIEW_SENTIMENT + weights.REHIRE_RATE + weights.RESPONSIVENESS;

    const finalScore = totalScore / totalWeight;

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, finalScore));
  }

  /**
   * Get status label based on score
   */
  static getScoreStatus(score) {
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
      status: this.getScoreStatus(history.score),
      trend: this.calculateTrend(history.previous_score, history.score),
      last_updated: history.createdAt
    };
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
   * Get improvement suggestions based on factor scores
   */
  static getImprovementSuggestions(factorBreakdown) {
    const suggestions = [];

    if (factorBreakdown.profile_completeness < 80) {
      suggestions.push({
        factor: 'profile_completeness',
        title: 'Complete your profile',
        description: 'Add your skills, portfolio, and company information to improve your score.',
        impact: 'High'
      });
    }

    if (factorBreakdown.verification < 60) {
      suggestions.push({
        factor: 'verification',
        title: 'Get verified',
        description: 'Connect your GitHub account and add a portfolio website to build trust.',
        impact: 'High'
      });
    }

    if (factorBreakdown.milestone_completion < 90) {
      suggestions.push({
        factor: 'milestone_completion',
        title: 'Complete more milestones',
        description: 'Focus on delivering high-quality work and completing assigned milestones.',
        impact: 'High'
      });
    }

    if (factorBreakdown.responsiveness < 70) {
      suggestions.push({
        factor: 'responsiveness',
        title: 'Improve response time',
        description: 'Respond to client messages within 24 hours to show reliability.',
        impact: 'Medium'
      });
    }

    return suggestions;
  }
}

module.exports = PFIService;