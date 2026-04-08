const mongoose = require('mongoose');

const pfiScoreHistorySchema = new mongoose.Schema(
  {
    freelancer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    previous_score: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    factor_breakdown: {
      profile_completeness: { type: Number, min: 0, max: 100 },
      verification: { type: Number, min: 0, max: 100 },
      proposal_acceptance: { type: Number, min: 0, max: 100 },
      milestone_completion: { type: Number, min: 0, max: 100 },
      on_time_delivery: { type: Number, min: 0, max: 100 },
      client_ratings: { type: Number, min: 0, max: 100 },
      review_sentiment: { type: Number, min: 0, max: 100 },
      rehire_rate: { type: Number, min: 0, max: 100 },
      responsiveness: { type: Number, min: 0, max: 100 },
      risk_penalty: { type: Number, min: 0, max: 100 } // penalty reduces overall score
    },
    triggered_by: {
      type: String,
      enum: ['manual_recompute', 'profile_update', 'milestone_completed', 'rating_received', 'dispute_created', 'cron_job'],
      required: true
    },
    reason_codes: [{
      type: String,
      enum: [
        'profile_completed',
        'verification_added',
        'proposal_accepted',
        'milestone_completed',
        'milestone_submitted_late',
        'rating_received',
        'review_sentiment_changed',
        'rehire_occurred',
        'response_time_improved',
        'dispute_resolved',
        'dispute_created',
        'refund_processed',
        'escrow_failed'
      ]
    }],
    metadata: {
      type: mongoose.Schema.Types.Mixed // flexible field for additional context
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance
pfiScoreHistorySchema.index({ freelancer_id: 1, createdAt: -1 });
pfiScoreHistorySchema.index({ triggered_by: 1 });
pfiScoreHistorySchema.index({ score: 1 });

module.exports = mongoose.model('PFIScoreHistory', pfiScoreHistorySchema);