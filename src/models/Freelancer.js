const mongoose = require('mongoose');

const freelancerSchema = new mongoose.Schema(
  {
    freelancer_id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      default: null
    },
    pfi_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Freelancer', freelancerSchema);
