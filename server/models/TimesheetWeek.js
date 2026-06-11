const mongoose = require('mongoose');

const timesheetWeekSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekStart:   { type: Date, required: true },
  status:      { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'draft' },
  submittedAt: { type: Date, default: null },
  reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt:  { type: Date, default: null },
  reviewNote:  { type: String, default: '' },
  totalMinutes:{ type: Number, default: 0 },
}, { timestamps: true });

timesheetWeekSchema.index({ user: 1, weekStart: 1 }, { unique: true });

module.exports = mongoose.model('TimesheetWeek', timesheetWeekSchema);
