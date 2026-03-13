const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    freelancer_id: {
      type: String,
      default: null
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    deliverable: {
      type: String,
      required: true
    },
    estimated_time: {
      type: String,
      required: true
    },
    timeline: {
      type: String,
      default: null
    },
    payment_amount: {
      type: Number,
      required: true,
      min: 0
    },
    approval_status: {
      type: String,
      enum: ['pending', 'approved', 'edited'],
      default: 'pending'
    },
    due_date: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'verified', 'paid', 'rejected'],
      default: 'pending'
    },
    verification_result: {
      type: String,
      enum: ['completed', 'partial', 'not_completed'],
      default: null
    },
    ai_feedback: {
      type: String,
      default: null
    },
    ai_quality_score: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Milestone', milestoneSchema);
