const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Task = require('../models/Task');
const Expense = require('../models/Expense');
const Project = require('../models/Project');
const User = require('../models/User');

// @desc    Attendance report by date range
// @route   GET /api/reports/attendance
// @access  Admin
const attendanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {};

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Per-employee detailed report
    const records = await Attendance.find(filter)
      .populate('user', 'name email department designation employeeId')
      .sort({ date: -1 });

    const detailed = records.map((r) => ({
      name: r.user?.name || '-',
      email: r.user?.email || '-',
      employeeId: r.user?.employeeId || '-',
      department: r.user?.department || '-',
      designation: r.user?.designation || '-',
      date: r.date?.toISOString().split('T')[0] || '-',
      checkIn: r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-',
      checkOut: r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-',
      totalHours: r.totalHours ? r.totalHours.toFixed(1) : '-',
      status: r.status || '-',
    }));

    // Department summary for chart
    const deptSummary = {};
    records.forEach((r) => {
      const dept = r.user?.department || 'Unknown';
      if (!deptSummary[dept]) deptSummary[dept] = { total: 0, present: 0, late: 0, absent: 0 };
      deptSummary[dept].total++;
      if (r.status === 'present') deptSummary[dept].present++;
      else if (r.status === 'late') deptSummary[dept].late++;
      else if (r.status === 'absent') deptSummary[dept].absent++;
    });

    const chartReport = Object.entries(deptSummary).map(([dept, data]) => ({
      department: dept,
      total: data.total,
      percentages: {
        present: data.total ? ((data.present / data.total) * 100).toFixed(1) : '0',
        late: data.total ? ((data.late / data.total) * 100).toFixed(1) : '0',
        absent: data.total ? ((data.absent / data.total) * 100).toFixed(1) : '0',
      },
    }));

    res.status(200).json({
      success: true,
      report: chartReport,
      detailed,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave report
// @route   GET /api/reports/leave
// @access  Admin
const leaveReport = async (req, res, next) => {
  try {
    const byType = await Leave.aggregate([
      { $group: { _id: '$leaveType', count: { $sum: 1 }, totalDays: { $sum: '$totalDays' } } },
    ]);

    const byStatus = await Leave.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byDepartment = await Leave.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      {
        $group: {
          _id: '$userInfo.department',
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' },
        },
      },
    ]);

    // Detailed per-employee leave records
    const detailed = await Leave.find()
      .populate('user', 'name email department employeeId')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    const detailedList = detailed.map((l) => ({
      employeeId: l.user?.employeeId || '-',
      name: l.user?.name || '-',
      email: l.user?.email || '-',
      department: l.user?.department || '-',
      leaveType: l.leaveType || '-',
      startDate: l.startDate?.toISOString().split('T')[0] || '-',
      endDate: l.endDate?.toISOString().split('T')[0] || '-',
      totalDays: l.totalDays || 0,
      reason: l.reason || '-',
      status: l.status || '-',
      reviewedBy: l.reviewedBy?.name || '-',
    }));

    res.status(200).json({
      success: true,
      byType,
      byStatus,
      byDepartment,
      detailed: detailedList,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Task report
// @route   GET /api/reports/tasks
// @access  Admin
const taskReport = async (req, res, next) => {
  try {
    const byStatus = await Task.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byAssignee = await Task.aggregate([
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          name: '$userInfo.name',
          total: 1,
          completed: 1,
          completionRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
            ],
          },
        },
      },
    ]);

    const projectCompletion = await Task.aggregate([
      { $match: { project: { $ne: null } } },
      {
        $group: {
          _id: '$project',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: '_id',
          as: 'projectInfo',
        },
      },
      { $unwind: '$projectInfo' },
      {
        $project: {
          name: '$projectInfo.name',
          total: 1,
          completed: 1,
          completionRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
            ],
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      report: {
        byStatus,
        byAssignee,
        projectCompletion,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Expense report
// @route   GET /api/reports/expenses
// @access  Admin
const expenseReport = async (req, res, next) => {
  try {
    const byCategory = await Expense.aggregate([
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const byStatus = await Expense.aggregate([
      { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const monthlyTotals = await Expense.aggregate([
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
    ]);

    res.status(200).json({
      success: true,
      report: {
        byCategory,
        byStatus,
        monthlyTotals,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Project report - tasks completed vs total per project
// @route   GET /api/reports/projects
// @access  Admin
const projectReport = async (req, res, next) => {
  try {
    const projects = await Project.find().select('name status startDate endDate');

    const projectStats = await Task.aggregate([
      { $match: { project: { $ne: null } } },
      {
        $group: {
          _id: '$project',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] },
          },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          overdueTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: '_id',
          as: 'project',
        },
      },
      { $unwind: '$project' },
      {
        $project: {
          name: '$project.name',
          status: '$project.status',
          totalTasks: 1,
          completedTasks: 1,
          inProgressTasks: 1,
          pendingTasks: 1,
          overdueTasks: 1,
          completionRate: {
            $cond: [
              { $eq: ['$totalTasks', 0] },
              0,
              { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] },
            ],
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      report: projectStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Employee report - headcount by department, role, join date distribution
// @route   GET /api/reports/employees
// @access  Admin
const employeeReport = async (req, res, next) => {
  try {
    const byDepartment = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const byRole = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const joinDateDistribution = await User.aggregate([
      { $match: { isActive: true, joiningDate: { $ne: null } } },
      {
        $group: {
          _id: { year: { $year: '$joiningDate' }, month: { $month: '$joiningDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
    ]);

    const totalActive = await User.countDocuments({ isActive: true });
    const totalInactive = await User.countDocuments({ isActive: false });

    res.status(200).json({
      success: true,
      report: {
        totalActive,
        totalInactive,
        byDepartment,
        byRole,
        joinDateDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export report as CSV string
// @route   GET /api/reports/export/:type
// @access  Admin
const exportCSV = async (req, res, next) => {
  try {
    const { type } = req.params;
    let data = [];
    let headers = '';

    switch (type) {
      case 'attendance': {
        const records = await Attendance.find()
          .populate('user', 'name department')
          .sort({ date: -1 })
          .lean();
        headers = 'Name,Department,Date,Check In,Check Out,Total Hours,Status';
        data = records.map((r) => [
          r.user?.name || '',
          r.user?.department || '',
          r.date ? new Date(r.date).toISOString().split('T')[0] : '',
          r.checkIn ? new Date(r.checkIn).toISOString() : '',
          r.checkOut ? new Date(r.checkOut).toISOString() : '',
          r.totalHours || '',
          r.status || '',
        ].join(','));
        break;
      }
      case 'leave': {
        const records = await Leave.find()
          .populate('user', 'name department')
          .sort({ createdAt: -1 })
          .lean();
        headers = 'Name,Department,Leave Type,Start Date,End Date,Total Days,Status,Reason';
        data = records.map((r) => [
          r.user?.name || '',
          r.user?.department || '',
          r.leaveType || '',
          r.startDate ? new Date(r.startDate).toISOString().split('T')[0] : '',
          r.endDate ? new Date(r.endDate).toISOString().split('T')[0] : '',
          r.totalDays || '',
          r.status || '',
          `"${(r.reason || '').replace(/"/g, '""')}"`,
        ].join(','));
        break;
      }
      case 'tasks': {
        const records = await Task.find()
          .populate('assignedTo', 'name')
          .populate('project', 'name')
          .sort({ createdAt: -1 })
          .lean();
        headers = 'Title,Project,Assigned To,Status,Priority,Due Date';
        data = records.map((r) => [
          `"${(r.title || '').replace(/"/g, '""')}"`,
          r.project?.name || '',
          r.assignedTo?.name || '',
          r.status || '',
          r.priority || '',
          r.dueDate ? new Date(r.dueDate).toISOString().split('T')[0] : '',
        ].join(','));
        break;
      }
      case 'expenses': {
        const records = await Expense.find()
          .populate('user', 'name department')
          .sort({ createdAt: -1 })
          .lean();
        headers = 'Name,Department,Title,Amount,Category,Date,Status';
        data = records.map((r) => [
          r.user?.name || '',
          r.user?.department || '',
          `"${(r.title || '').replace(/"/g, '""')}"`,
          r.amount || '',
          r.category || '',
          r.date ? new Date(r.date).toISOString().split('T')[0] : '',
          r.status || '',
        ].join(','));
        break;
      }
      case 'employees': {
        const records = await User.find({ isActive: true })
          .select('name email department designation role joiningDate')
          .sort({ name: 1 })
          .lean();
        headers = 'Name,Email,Department,Designation,Role,Joining Date';
        data = records.map((r) => [
          r.name || '',
          r.email || '',
          r.department || '',
          r.designation || '',
          r.role || '',
          r.joiningDate ? new Date(r.joiningDate).toISOString().split('T')[0] : '',
        ].join(','));
        break;
      }
      default:
        res.status(400);
        return next(new Error('Invalid report type'));
    }

    const csv = [headers, ...data].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  attendanceReport,
  leaveReport,
  taskReport,
  expenseReport,
  projectReport,
  employeeReport,
  exportCSV,
};
