const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      trim: true
    },
    projectTitle: {
      type: String,
      required: true,
      trim: true
    },
    projectDescription: {
      type: String,
      trim: true
    },
    projectBudget: {
      type: Number,
      min: 0
    },
    requiredSkills: [{
      type: String,
      trim: true
    }],
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    employerEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    employerName: {
      type: String,
      trim: true
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    freelancerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    freelancerName: {
      type: String,
      required: true,
      trim: true
    },
    proposalText: {
      type: String,
      trim: true
    },
    bidAmount: {
      type: Number,
      min: 0
    },
    expectedRate: {
      type: Number,
      min: 0
    },
    estimatedDeliveryDays: {
      type: Number,
      min: 0
    },
    responseTimeMinutes: {
      type: Number,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract'
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Proposal', proposalSchema);
