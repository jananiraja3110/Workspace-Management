const Shift = require('../models/Shift');
const { logActivity } = require('../utils/logActivity');

// @desc    Get all active shifts
// @route   GET /api/shifts
// @access  Private
const getShifts = async (req, res, next) => {
  try {
    const shifts = await Shift.find({ isActive: true }).sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: shifts.length,
      shifts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create shift
// @route   POST /api/shifts
// @access  Admin
const createShift = async (req, res, next) => {
  try {
    const shift = await Shift.create(req.body);

    await logActivity(
      req.user._id,
      'create',
      'Shift',
      shift._id,
      `Created shift: ${shift.name}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      shift,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update shift
// @route   PUT /api/shifts/:id
// @access  Admin
const updateShift = async (req, res, next) => {
  try {
    const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!shift) {
      res.status(404);
      return next(new Error('Shift not found'));
    }

    await logActivity(
      req.user._id,
      'update',
      'Shift',
      shift._id,
      `Updated shift: ${shift.name}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      shift,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete shift (soft delete)
// @route   DELETE /api/shifts/:id
// @access  Admin
const deleteShift = async (req, res, next) => {
  try {
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!shift) {
      res.status(404);
      return next(new Error('Shift not found'));
    }

    await logActivity(
      req.user._id,
      'delete',
      'Shift',
      shift._id,
      `Deactivated shift: ${shift.name}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Shift deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
};
