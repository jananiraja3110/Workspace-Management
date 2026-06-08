const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: [true, 'Title is required'], trim: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      enum: ['travel', 'food', 'office_supplies', 'software', 'other'],
      required: true,
    },
    description: { type: String },
    date: { type: Date, required: true },
    receiptPath: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'reimbursed'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String },
    reimbursedAt: { type: Date },
  },
  { timestamps: true }
);

expenseSchema.index({ user: 1, status: 1 });
expenseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
