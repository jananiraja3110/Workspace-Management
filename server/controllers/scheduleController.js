const Schedule = require('../models/Schedule');
const User = require('../models/User');
const { logActivity } = require('../utils/logActivity');

// @desc    Assign shift to user for a date
// @route   POST /api/schedules
// @access  Admin, Manager
const assignSchedule = async (req, res, next) => {
  try {
    req.body.createdBy = req.user._id;

    const schedule = await Schedule.create(req.body);

    await logActivity(
      req.user._id,
      'create',
      'Schedule',
      schedule._id,
      `Assigned schedule for ${schedule.date}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      schedule,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk assign shifts for multiple users for a week
// @route   POST /api/schedules/bulk
// @access  Admin, Manager
const bulkAssign = async (req, res, next) => {
  try {
    const { schedules } = req.body;

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      res.status(400);
      return next(new Error('Please provide an array of schedules'));
    }

    const scheduleDocs = schedules.map((s) => ({
      ...s,
      createdBy: req.user._id,
    }));

    const created = await Schedule.insertMany(scheduleDocs, { ordered: false });

    await logActivity(
      req.user._id,
      'bulk_create',
      'Schedule',
      null,
      `Bulk assigned ${created.length} schedules`,
      req.ip
    );

    res.status(201).json({
      success: true,
      count: created.length,
      schedules: created,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my schedules
// @route   GET /api/schedules/my
// @access  Private
const getMySchedule = async (req, res, next) => {
  try {
    const filter = { user: req.user._id };

    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    const schedules = await Schedule.find(filter)
      .populate('shift', 'name startTime endTime color')
      .sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: schedules.length,
      schedules,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team schedule for a week
// @route   GET /api/schedules/team
// @access  Admin, Manager
const getTeamSchedule = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    // Manager sees only their team
    if (req.user.role === 'hr') {
      const teamMembers = await User.find({ managerId: req.user._id }).select('_id');
      const teamIds = teamMembers.map((m) => m._id);
      teamIds.push(req.user._id);
      filter.user = { $in: teamIds };
    }

    const schedules = await Schedule.find(filter)
      .populate('user', 'name department designation')
      .populate('shift', 'name startTime endTime color')
      .sort({ date: 1, user: 1 });

    res.status(200).json({
      success: true,
      count: schedules.length,
      schedules,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Admin, Manager
const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('user', 'name')
      .populate('shift', 'name startTime endTime color');

    if (!schedule) {
      res.status(404);
      return next(new Error('Schedule not found'));
    }

    await logActivity(
      req.user._id,
      'update',
      'Schedule',
      schedule._id,
      `Updated schedule for ${schedule.date}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      schedule,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assignSchedule,
  bulkAssign,
  getMySchedule,
  getTeamSchedule,
  updateSchedule,
};
