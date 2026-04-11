const mongoose = require('mongoose');

const escrowSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    releasedAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['HOLD', 'PARTIAL', 'RELEASED', 'REFUNDED'],
      default: 'HOLD'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Escrow', escrowSchema);
