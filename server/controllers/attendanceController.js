const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { createNotification } = require('../utils/createNotification');
const { logActivity } = require('../utils/logActivity');

// Helper: get today's date at midnight
const getTodayDate = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// @desc    Check in for today
// @route   POST /api/attendance/check-in
// @access  Private
const checkIn = async (req, res, next) => {
  try {
    const today = getTodayDate();

    // Check if already checked in today
    const existingRecord = await Attendance.findOne({
      user: req.user._id,
      date: today,
    });

    if (existingRecord) {
      res.status(400);
      return next(new Error('You have already checked in today'));
    }

    const now = new Date();

    // Determine status: late if after 9:30 AM
    const lateThreshold = new Date(today);
    lateThreshold.setHours(9, 30, 0, 0);

    const status = now > lateThreshold ? 'late' : 'present';

    const attendance = await Attendance.create({
      user: req.user._id,
      date: today,
      checkIn: now,
      status,
    });

    // Notify if late
    if (status === 'late') {
      await createNotification(
        req.user._id,
        'Late Check-in',
        'You have been marked as late for today.',
        'general',
        '/attendance'
      );
    }

    await logActivity(
      req.user._id,
      'check-in',
      'Attendance',
      attendance._id,
      `Checked in at ${now.toLocaleTimeString()} - ${status}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check out for today
// @route   POST /api/attendance/check-out
// @access  Private
const checkOut = async (req, res, next) => {
  try {
    const today = getTodayDate();

    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: today,
    });

    if (!attendance) {
      res.status(400);
      return next(new Error('You have not checked in today'));
    }

    if (attendance.checkOut) {
      res.status(400);
      return next(new Error('You have already checked out today'));
    }

    const now = new Date();
    attendance.checkOut = now;

    // Calculate total hours
    const diffMs = now.getTime() - attendance.checkIn.getTime();
    attendance.totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    await attendance.save();

    await logActivity(
      req.user._id,
      'check-out',
      'Attendance',
      attendance._id,
      `Checked out at ${now.toLocaleTimeString()} - Total: ${attendance.totalHours}h`,
      req.ip
    );

    res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my attendance records
// @route   GET /api/attendance/my
// @access  Private
const getMyAttendance = async (req, res, next) => {
  try {
    const filter = { user: req.user._id };

    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    } else if (req.query.startDate) {
      filter.date = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.date = { $lte: new Date(req.query.endDate) };
    }

    const attendance = await Attendance.find(filter).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's attendance record
// @route   GET /api/attendance/today
// @access  Private
const getTodayAttendance = async (req, res, next) => {
  try {
    const today = getTodayDate();

    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: today,
    });

    res.status(200).json({
      success: true,
      attendance: attendance || null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team attendance (admin: all, manager: their team)
// @route   GET /api/attendance/team
// @access  Admin, Manager
const getTeamAttendance = async (req, res, next) => {
  try {
    const filter = {};

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    } else if (req.query.date) {
      filter.date = new Date(req.query.date);
    } else {
      // Default to today
      filter.date = getTodayDate();
    }

    // Manager: only their team
    if (req.user.role === 'hr') {
      const teamMembers = await User.find({
        managerId: req.user._id,
        isActive: true,
      }).select('_id');
      const teamIds = teamMembers.map((m) => m._id);
      // Include the manager themselves
      teamIds.push(req.user._id);
      filter.user = { $in: teamIds };
    }

    const attendance = await Attendance.find(filter)
      .populate('user', 'name email department employeeId')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance report (aggregate stats)
// @route   GET /api/attendance/report
// @access  Admin
const getAttendanceReport = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    const stats = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgHours: { $avg: '$totalHours' },
        },
      },
    ]);

    const totalRecords = await Attendance.countDocuments(filter);

    const avgHoursOverall = await Attendance.aggregate([
      { $match: { ...filter, totalHours: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgHours: { $avg: '$totalHours' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      report: {
        totalRecords,
        statusBreakdown: stats,
        averageHours: avgHoursOverall.length > 0
          ? parseFloat(avgHoursOverall[0].avgHours.toFixed(2))
          : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkIn,
  checkOut,
  getMyAttendance,
  getTodayAttendance,
  getTeamAttendance,
  getAttendanceReport,
};
