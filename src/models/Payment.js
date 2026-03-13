const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    milestone_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
      required: true
    },
    employer_id: {
      type: String,
      required: true
    },
    freelancer_id: {
      type: String,
      default: null
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    action: {
      type: String,
      enum: ['release_full', 'release_partial', 'refund_employer'],
      required: true
    },
    status: {
      type: String,
      enum: ['locked', 'released', 'refunded'],
      default: 'locked'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
