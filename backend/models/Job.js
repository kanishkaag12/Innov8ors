const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    requiredSkills: [{
      type: String,
      required: true
    }],
    category: {
      type: String,
      required: true
    },
    experienceLevel: {
      type: String,
      enum: ['junior', 'mid', 'senior']
    },
    budgetMin: {
      type: Number
    },
    budgetMax: {
      type: Number
    },
    projectType: {
      type: String,
      enum: ['fixed', 'hourly'],
      required: true
    },
    location: {
      type: String,
      default: 'Remote'
    },
    employerName: {
      type: String,
      default: 'SynapEscrow Client'
    },
    employerCompanyName: {
      type: String,
      default: ''
    },
    isRemote: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'draft'],
      default: 'open'
    },
    matchingText: {
      type: String
    },
    jobEmbedding: [{
      type: Number
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
);

module.exports = mongoose.model('Job', jobSchema);
