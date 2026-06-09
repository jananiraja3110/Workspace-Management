const mongoose = require('mongoose');

const spaceSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    color:   { type: String, default: '#6366F1' },
    icon:    { type: String, default: '' },
    description: { type: String, default: '' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    position: { type: Number, default: 1000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Space', spaceSchema);
