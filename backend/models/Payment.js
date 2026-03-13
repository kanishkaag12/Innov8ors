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
    amount: {
      type: Number,
      required: true,
      min: 0
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
