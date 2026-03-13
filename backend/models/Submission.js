const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    milestone_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
      required: true
    },
    freelancer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      default: null
    },
    github_link: {
      type: String,
      default: null
    },
    file_url: {
      type: String,
      default: null
    },
    submitted_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Submission', submissionSchema);
