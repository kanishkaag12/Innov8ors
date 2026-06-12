const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    deliverable: {
      type: String,
      required: true
    },
    payment_amount: {
      type: Number,
      required: true,
      min: 0
    },
    estimated_time: {
      type: String,
      default: ''
    },
    complexity: {
      type: String,
      default: 'Medium'
    },
    payout_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    order: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'completed'],
      default: 'pending'
    },
    payment_status: {
      type: String,
      enum: ['idle', 'requested', 'approved', 'rejected', 'paid', 'partially_paid'],
      default: 'idle'
    },
    completion_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    amount_paid: {
      type: Number,
      default: 0,
      min: 0
    },
    amount_remaining: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

milestoneSchema.post('save', function (doc) {
  setImmediate(async () => {
    try {
      const Contract = require('./Contract');
      const PFIService = require('../services/pfiService');
      const contract = await Contract.findOne({ projectId: String(doc.project_id) }).select('freelancerId').lean();
      if (contract && contract.freelancerId) {
        await PFIService.calculatePFIScore(String(contract.freelancerId), 'milestone_completed', ['milestone_completed']);
      }
    } catch (err) {
      console.error('[PFI Hook] Failed to recalculate PFI after milestone save:', err.message);
    }
  });
});

module.exports = mongoose.model('Milestone', milestoneSchema);
