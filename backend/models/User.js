const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    role: {
      type: String,
      enum: ['employer', 'freelancer', 'admin'],
      required: true
    },
    pfi_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    onboardingCompleted: {
      type: Boolean,
      default: false
    },
    companySize: {
      type: String
    },
    companyName: {
      type: String
    },
    website: {
      type: String
    },
    freelancerProfile: {
      category: { type: String },
      subCategories: [{ type: String }],
      skills: [{ type: String }]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
