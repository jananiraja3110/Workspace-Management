const mongoose = require('mongoose');

const meetingRoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Room name is required'], unique: true, trim: true },
    capacity: { type: Number },
    location: { type: String },
    amenities: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MeetingRoom', meetingRoomSchema);
