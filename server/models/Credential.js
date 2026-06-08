const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: [true, 'Title is required'], trim: true },
    url: { type: String },
    username: { type: String },
    password: { type: String },
    notes: { type: String },
    category: { type: String, enum: ['work', 'personal', 'social', 'banking', 'other'], default: 'other' },
  },
  { timestamps: true }
);

credentialSchema.index({ user: 1 });

module.exports = mongoose.model('Credential', credentialSchema);
