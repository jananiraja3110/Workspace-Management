const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
    date: { type: Date, required: true },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

scheduleSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
