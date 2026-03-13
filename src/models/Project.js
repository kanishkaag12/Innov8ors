const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    employer_id: {
      type: String,
      required: true
    },
    freelancer_id: {
      type: String,
      default: null
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
    budget: {
      type: Number,
      required: true,
      min: 0
    },
    deadline: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'in_progress', 'completed', 'cancelled'],
      default: 'active'
    },
    escrow_status: {
      type: String,
      enum: ['unfunded', 'funded', 'partially_released', 'released', 'refunded'],
      default: 'unfunded'
    },
    escrow_locked_total: {
      type: Number,
      default: 0,
      min: 0
    },
    escrow_released_total: {
      type: Number,
      default: 0,
      min: 0
    },
    escrow_refunded_total: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Project', projectSchema);
