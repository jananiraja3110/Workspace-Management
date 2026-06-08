const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Shift name is required'], trim: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    color: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shift', shiftSchema);
