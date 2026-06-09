const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  task:      { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  minutes:   { type: Number, default: 0 },
  startedAt: { type: Date, default: null },
  endedAt:   { type: Date, default: null },
  date:      { type: Date, required: true },
  note:      { type: String, default: null },
}, { timestamps: true });

timeEntrySchema.index({ user: 1, date: 1 });

module.exports = mongoose.model('TimeEntry', timeEntrySchema);
