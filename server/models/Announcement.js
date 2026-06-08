const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    content: { type: String, required: [true, 'Content is required'] },
    category: { type: String, enum: ['general', 'urgent', 'policy', 'celebration'], default: 'general' },
    isPinned: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    visibleTo: { type: String, enum: ['all', 'hr', 'developers'], default: 'all' },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ isPinned: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
