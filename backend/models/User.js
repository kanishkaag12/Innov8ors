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
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    escrowLocked: {
      type: Number,
      default: 0,
      min: 0
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
      fullName: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
      headline: { type: String, trim: true },
      bio: { type: String, trim: true },
      location: { type: String, trim: true },
      availability: { type: String, trim: true },
      skills: [{ type: String, trim: true }],
      interests: [{ type: String, trim: true }],
      preferredCategories: [{ type: String, trim: true }],
      primaryCategory: { type: String, trim: true },
      experienceLevel: { type: String, enum: ['junior', 'mid', 'senior'] },
      preferredBudgetMin: { type: Number },
      preferredBudgetMax: { type: Number },
      preferredProjectType: { type: String, enum: ['fixed', 'hourly'] },
      portfolioLinks: [{ type: String, trim: true }],
      languages: [{ type: String, trim: true }],
      profileEmbedding: [{ type: Number }],
      embeddingText: { type: String },
      lastEmbeddingAt: { type: Date }
    },
    employerProfile: {
      fullName: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
      companyName: { type: String, trim: true },
      about: { type: String, trim: true },
      location: { type: String, trim: true },
      website: { type: String, trim: true },
      industry: { type: String, trim: true },
      hiringInterests: [{ type: String, trim: true }],
      preferredFreelancerCategories: [{ type: String, trim: true }],
      companySize: { type: String, trim: true },
      hiringGoals: { type: String, trim: true },
      verificationInfo: { type: String, trim: true }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
