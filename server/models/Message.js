const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String },
    fileName: { type: String },
    filePath: { type: String },
    fileType: { type: String },
    read: { type: Boolean, default: false },
    reactions: [{
      emoji: { type: String, required: true },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    }],
  },
  { timestamps: true }
);

messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ receiver: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
