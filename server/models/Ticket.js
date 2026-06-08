const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: [true, 'Subject is required'], trim: true },
    description: { type: String, required: [true, 'Description is required'] },
    category: {
      type: String,
      enum: ['it_support', 'hr_query', 'facility', 'access_request', 'other'],
      required: true,
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

ticketSchema.index({ user: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ assignedTo: 1 });

// Auto-generate ticketId before saving
ticketSchema.pre('save', async function (next) {
  if (this.isNew && !this.ticketId) {
    const lastTicket = await mongoose.model('Ticket').findOne({}, { ticketId: 1 }).sort({ createdAt: -1 });
    let nextNum = 1;
    if (lastTicket && lastTicket.ticketId) {
      const num = parseInt(lastTicket.ticketId.replace('TKT-', ''), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    this.ticketId = `TKT-${String(nextNum).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
