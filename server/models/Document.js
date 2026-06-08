const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number },
    fileType: { type: String },
    folder: { type: String, default: 'general' },
    type: { type: String, enum: ['company', 'personal'], required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    visibleTo: { type: String, enum: ['all', 'admin', 'hr', 'developer'], default: 'all' },
  },
  { timestamps: true }
);

documentSchema.index({ type: 1, user: 1 });
documentSchema.index({ folder: 1 });

module.exports = mongoose.model('Document', documentSchema);
