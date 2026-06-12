const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema(
  {
    proposalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proposal',
      required: true
    },
    projectId: {
      type: String,
      required: true,
      trim: true
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    budget: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active'
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

contractSchema.post('save', function (doc) {
  if (doc.freelancerId) {
    setImmediate(async () => {
      try {
        const PFIService = require('../services/pfiService');
        await PFIService.calculatePFIScore(String(doc.freelancerId), 'profile_update', ['rehire_occurred']);
      } catch (err) {
        console.error('[PFI Hook] Failed to recalculate PFI after contract save:', err.message);
      }
    });
  }
});

contractSchema.post('findOneAndUpdate', function (doc) {
  if (doc && doc.freelancerId) {
    setImmediate(async () => {
      try {
        const PFIService = require('../services/pfiService');
        await PFIService.calculatePFIScore(String(doc.freelancerId), 'profile_update', ['rehire_occurred']);
      } catch (err) {
        console.error('[PFI Hook] Failed to recalculate PFI after contract update:', err.message);
      }
    });
  }
});

module.exports = mongoose.model('Contract', contractSchema);
