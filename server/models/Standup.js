const mongoose = require('mongoose');

const standupSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    today: { type: String, required: true },
    blockers: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    hoursWorked: { type: Number },
    tasksWorked: { type: String },
    status: { type: String, enum: ['in-progress', 'completed', 'blocked'], default: 'in-progress' },
  },
  { timestamps: true }
);

standupSchema.index({ user: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('Standup', standupSchema);
