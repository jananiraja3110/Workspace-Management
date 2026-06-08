const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Event title is required'], trim: true },
    description: { type: String },
    date: { type: Date, required: true },
    endDate: { type: Date },
    type: { type: String, enum: ['holiday', 'meeting', 'deadline', 'other'], default: 'other' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    visibleTo: { type: String, enum: ['all', 'admin', 'hr', 'developer'], default: 'all' },
  },
  { timestamps: true }
);

eventSchema.index({ date: 1 });

module.exports = mongoose.model('Event', eventSchema);
