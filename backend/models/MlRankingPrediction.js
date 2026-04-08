const mongoose = require('mongoose');

const mlRankingPredictionSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      index: true
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    modelVersion: {
      type: String,
      default: 'freelancer_ranker_v1'
    },
    mlScore: {
      type: Number,
      required: true
    },
    rank: {
      type: Number,
      required: true
    },
    percentileRank: {
      type: Number,
      default: 0
    },
    semanticSimilarityScore: {
      type: Number,
      default: 0
    },
    proposalQualityScore: {
      type: Number,
      default: 0
    },
    priceFitScore: {
      type: Number,
      default: 0
    },
    reliabilityScore: {
      type: Number,
      default: 0
    },
    predictedSuccessProbability: {
      type: Number,
      default: 0
    },
    features: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    strengths: {
      type: [String],
      default: []
    },
    risks: {
      type: [String],
      default: []
    },
    shortExplanation: {
      type: String,
      default: ''
    },
    computedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

mlRankingPredictionSchema.index({ projectId: 1, freelancerId: 1 }, { unique: true });
mlRankingPredictionSchema.index({ projectId: 1, rank: 1 });

module.exports = mongoose.model('MlRankingPrediction', mlRankingPredictionSchema);
