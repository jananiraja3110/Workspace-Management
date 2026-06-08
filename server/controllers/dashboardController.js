const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const Expense = require('../models/Expense');

// Helper: get today's date at midnight
const getTodayDate = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// @desc    Get dashboard stats based on user role
// @route   GET /api/dashboard/stats
// @access  Private
const getStats = async (req, res, next) => {
  try {
    const { role, _id } = req.user;
    const today = getTodayDate();

    if (role === 'admin') {
      // Total employees and managers
      const totalEmployees = await User.countDocuments({
        role: 'developer',
        isActive: true,
      });
      const totalManagers = await User.countDocuments({
        role: 'hr',
        isActive: true,
      });

      // Today's attendance
      const totalActiveUsers = await User.countDocuments({ isActive: true });
      const todayAttendanceCount = await Attendance.countDocuments({
        date: today,
      });
      const todayAttendancePercent =
        totalActiveUsers > 0
          ? parseFloat(
              ((todayAttendanceCount / totalActiveUsers) * 100).toFixed(1)
            )
          : 0;

      // Pending leaves
      const pendingLeaves = await Leave.countDocuments({ status: 'pending' });

      // Overdue tasks
      const overdueTasks = await Task.countDocuments({
        status: { $in: ['pending', 'in-progress'] },
        dueDate: { $lt: today },
      });

      // Task stats breakdown
      const taskAgg = await Task.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      const taskStats = { pending: 0, 'in-progress': 0, completed: 0 };
      taskAgg.forEach(t => { if (taskStats.hasOwnProperty(t._id)) taskStats[t._id] = t.count; });

      // Recent activity (last 10)
      const recentActivity = await ActivityLog.find()
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .limit(10);

      return res.status(200).json({
        success: true,
        stats: {
          totalEmployees,
          totalManagers,
          todayAttendanceCount,
          todayAttendancePercent,
          attendancePercentage: todayAttendancePercent,
          pendingLeaves,
          overdueTasks,
          tasksPending: taskStats.pending,
          tasksInProgress: taskStats['in-progress'],
          tasksCompleted: taskStats.completed,
          recentActivity,
        },
      });
    }

    if (role === 'hr') {
      // Team size
      const teamMembers = await User.find({
        managerId: _id,
        isActive: true,
      }).select('_id');
      const teamIds = teamMembers.map((m) => m._id);
      const teamSize = teamIds.length;

      // Team attendance today
      const teamAttendanceToday = await Attendance.countDocuments({
        user: { $in: teamIds },
        date: today,
      });

      // Pending leaves for my team
      const pendingLeaves = await Leave.countDocuments({
        user: { $in: teamIds },
        status: 'pending',
      });

      // Task stats for tasks I assigned
      const taskStatsAgg = await Task.aggregate([
        { $match: { assignedBy: _id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const taskStats = {
        pending: 0,
        'in-progress': 0,
        completed: 0,
      };
      taskStatsAgg.forEach((item) => {
        if (taskStats.hasOwnProperty(item._id)) {
          taskStats[item._id] = item.count;
        }
      });

      return res.status(200).json({
        success: true,
        stats: {
          teamSize,
          teamAttendanceToday,
          pendingLeaves,
          taskStats,
        },
      });
    }

    // Employee
    // Today's attendance
    const todayAttendance = await Attendance.findOne({
      user: _id,
      date: today,
    });

    // Pending tasks
    const pendingTasks = await Task.countDocuments({
      assignedTo: _id,
      status: { $in: ['pending', 'in-progress'] },
    });

    // Upcoming deadlines (next 7 days)
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const upcomingDeadlines = await Task.find({
      assignedTo: _id,
      status: { $in: ['pending', 'in-progress'] },
      dueDate: { $gte: today, $lte: sevenDaysLater },
    })
      .populate('project', 'name')
      .sort({ dueDate: 1 });

    // Leave balance
    const user = await User.findById(_id).select('leaveBalance');

    return res.status(200).json({
      success: true,
      stats: {
        todayAttendance: todayAttendance || null,
        pendingTasks,
        upcomingDeadlines,
        leaveBalance: user.leaveBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
};
