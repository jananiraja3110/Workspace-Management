const path = require('path');
const fs = require('fs');
const Payslip = require('../models/Payslip');
const { createNotification } = require('../utils/createNotification');
const { logActivity } = require('../utils/logActivity');

// @desc    Get my payslips
// @route   GET /api/payslips/my
// @access  Private
const getMyPayslips = async (req, res, next) => {
  try {
    const payslips = await Payslip.find({ user: req.user._id })
      .sort({ year: -1, month: -1 });

    res.status(200).json({
      success: true,
      count: payslips.length,
      payslips,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payslip by ID
// @route   GET /api/payslips/:id
// @access  Private (owner only)
const getPayslipById = async (req, res, next) => {
  try {
    const payslip = await Payslip.findById(req.params.id);

    if (!payslip) {
      res.status(404);
      return next(new Error('Payslip not found'));
    }

    if (payslip.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('Not authorized to view this payslip'));
    }

    res.status(200).json({
      success: true,
      payslip,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download payslip PDF
// @route   GET /api/payslips/:id/download
// @access  Private (owner only)
const downloadPayslip = async (req, res, next) => {
  try {
    const payslip = await Payslip.findById(req.params.id);

    if (!payslip) {
      res.status(404);
      return next(new Error('Payslip not found'));
    }

    if (payslip.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('Not authorized to download this payslip'));
    }

    if (!payslip.pdfPath) {
      res.status(404);
      return next(new Error('PDF not available for this payslip'));
    }

    const filePath = path.resolve(payslip.pdfPath);

    if (!fs.existsSync(filePath)) {
      res.status(404);
      return next(new Error('PDF file not found on server'));
    }

    res.download(filePath, `payslip-${payslip.year}-${payslip.month}.pdf`);
  } catch (error) {
    next(error);
  }
};

// @desc    Create payslip
// @route   POST /api/payslips
// @access  Admin
const createPayslip = async (req, res, next) => {
  try {
    const payslipData = {
      ...req.body,
      uploadedBy: req.user._id,
    };

    if (req.file) {
      payslipData.pdfPath = req.file.path;
    }

    const payslip = await Payslip.create(payslipData);

    await createNotification(
      payslip.user,
      'New Payslip',
      `Your payslip for ${payslip.month}/${payslip.year} is available`,
      'payslip',
      '/payslips'
    );

    await logActivity(
      req.user._id,
      'create',
      'Payslip',
      payslip._id,
      `Created payslip for ${payslip.month}/${payslip.year}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      payslip,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk create payslips for a month
// @route   POST /api/payslips/bulk
// @access  Admin
const bulkCreatePayslips = async (req, res, next) => {
  try {
    const { payslips } = req.body;

    if (!payslips || !Array.isArray(payslips) || payslips.length === 0) {
      res.status(400);
      return next(new Error('Please provide an array of payslips'));
    }

    const payslipDocs = payslips.map((p) => ({
      ...p,
      uploadedBy: req.user._id,
    }));

    const created = await Payslip.insertMany(payslipDocs);

    // Send notifications to all users
    for (const payslip of created) {
      await createNotification(
        payslip.user,
        'New Payslip',
        `Your payslip for ${payslip.month}/${payslip.year} is available`,
        'payslip',
        '/payslips'
      );
    }

    await logActivity(
      req.user._id,
      'bulk_create',
      'Payslip',
      null,
      `Bulk created ${created.length} payslips`,
      req.ip
    );

    res.status(201).json({
      success: true,
      count: created.length,
      payslips: created,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payslip
// @route   DELETE /api/payslips/:id
// @access  Admin
const deletePayslip = async (req, res, next) => {
  try {
    const payslip = await Payslip.findById(req.params.id);

    if (!payslip) {
      res.status(404);
      return next(new Error('Payslip not found'));
    }

    // Delete PDF file if exists
    if (payslip.pdfPath) {
      const filePath = path.resolve(payslip.pdfPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await payslip.deleteOne();

    await logActivity(
      req.user._id,
      'delete',
      'Payslip',
      payslip._id,
      `Deleted payslip for ${payslip.month}/${payslip.year}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Payslip deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyPayslips,
  getPayslipById,
  downloadPayslip,
  createPayslip,
  bulkCreatePayslips,
  deletePayslip,
};
