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
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Milestone', milestoneSchema);
