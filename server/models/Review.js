const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    period: { type: String, required: true },
    type: { type: String, enum: ['quarterly', 'annual'], default: 'quarterly' },
    ratings: {
      workQuality: { type: Number },
      communication: { type: Number },
      teamwork: { type: Number },
      punctuality: { type: Number },
      initiative: { type: Number },
    },
    overallRating: { type: Number },
    strengths: { type: String },
    improvements: { type: String },
    goals: { type: String },
    selfAssessment: {
      summary: { type: String },
      rating: { type: Number },
      submittedAt: { type: Date },
    },
    status: {
      type: String,
      enum: ['pending', 'self_assessment', 'reviewed', 'acknowledged'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

reviewSchema.index({ employee: 1, period: 1 });
reviewSchema.index({ reviewer: 1 });

module.exports = mongoose.model('Review', reviewSchema);
