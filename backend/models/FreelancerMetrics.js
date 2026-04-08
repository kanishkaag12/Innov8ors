const mongoose = require('mongoose');

const freelancerMetricsSchema = new mongoose.Schema(
  {
    freelancer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    // Profile completeness metrics
    profile_completeness: {
      score: { type: Number, default: 0, min: 0, max: 100 },
      last_updated: { type: Date, default: Date.now }
    },
    // Verification metrics
    verification_status: {
      github_verified: { type: Boolean, default: false },
      portfolio_verified: { type: Boolean, default: false },
      identity_verified: { type: Boolean, default: false },
      score: { type: Number, default: 0, min: 0, max: 100 },
      last_updated: { type: Date, default: Date.now }
    },
    // Performance metrics
    performance_metrics: {
      total_proposals: { type: Number, default: 0 },
      accepted_proposals: { type: Number, default: 0 },
      proposal_acceptance_rate: { type: Number, default: 0, min: 0, max: 100 },
      total_milestones: { type: Number, default: 0 },
      completed_milestones: { type: Number, default: 0 },
      milestone_completion_rate: { type: Number, default: 0, min: 0, max: 100 },
      on_time_deliveries: { type: Number, default: 0 },
      total_deliveries: { type: Number, default: 0 },
      on_time_delivery_rate: { type: Number, default: 0, min: 0, max: 100 },
      last_updated: { type: Date, default: Date.now }
    },
    // Client feedback metrics
    client_feedback: {
      total_ratings: { type: Number, default: 0 },
      average_rating: { type: Number, default: 0, min: 0, max: 5 },
      total_reviews: { type: Number, default: 0 },
      positive_reviews: { type: Number, default: 0 },
      review_sentiment_score: { type: Number, default: 0, min: 0, max: 100 },
      total_rehires: { type: Number, default: 0 },
      rehire_rate: { type: Number, default: 0, min: 0, max: 100 },
      last_updated: { type: Date, default: Date.now }
    },
    // Responsiveness metrics
    responsiveness: {
      average_response_time_hours: { type: Number, default: 24 }, // hours
      response_rate: { type: Number, default: 0, min: 0, max: 100 }, // percentage
      score: { type: Number, default: 0, min: 0, max: 100 },
      last_updated: { type: Date, default: Date.now }
    },
    // Risk metrics (penalties)
    risk_metrics: {
      total_disputes: { type: Number, default: 0 },
      active_disputes: { type: Number, default: 0 },
      refunds_processed: { type: Number, default: 0 },
      failed_escrows: { type: Number, default: 0 },
      penalty_score: { type: Number, default: 0, min: 0, max: 100 }, // 0 = no penalty, 100 = max penalty
      last_updated: { type: Date, default: Date.now }
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance (freelancer_id already indexed via unique constraint)
freelancerMetricsSchema.index({ 'performance_metrics.last_updated': -1 });
freelancerMetricsSchema.index({ 'client_feedback.last_updated': -1 });

module.exports = mongoose.model('FreelancerMetrics', freelancerMetricsSchema);