const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    basicPay: { type: Number },
    hra: { type: Number },
    allowances: { type: Number },
    deductions: { type: Number },
    netPay: { type: Number, required: true },
    pdfPath: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

payslipSchema.index({ user: 1, year: -1, month: -1 }, { unique: true });

module.exports = mongoose.model('Payslip', payslipSchema);
