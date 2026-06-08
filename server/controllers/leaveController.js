const Leave = require('../models/Leave');
const User = require('../models/User');
const { createNotification } = require('../utils/createNotification');
const { logActivity } = require('../utils/logActivity');
const { sendEmail } = require('../utils/sendEmail');
const { leaveRequestEmail, leaveReviewEmail } = require('../utils/emailTemplates');

// @desc    Apply for leave
// @route   POST /api/leaves
// @access  Private
const applyLeave = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    // Calculate total days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check if user has enough leave balance
    const user = await User.findById(req.user._id);
    if (!user.leaveBalance || user.leaveBalance[leaveType] < totalDays) {
      res.status(400);
      return next(
        new Error(
          `Insufficient ${leaveType} leave balance. Available: ${
            user.leaveBalance ? user.leaveBalance[leaveType] : 0
          }, Requested: ${totalDays}`
        )
      );
    }

    const leave = await Leave.create({
      user: req.user._id,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
    });

    // Notify the manager
    if (user.managerId) {
      const manager = await User.findById(user.managerId);
      if (manager) {
        await createNotification(
          manager._id,
          'New Leave Request',
          `${user.name} has requested ${leaveType} leave for ${totalDays} day(s)`,
          'leave',
          `/leaves/pending`
        );

        // Send email to manager
        sendEmail(
          manager.email,
          'New Leave Request - AD Workspace',
          leaveRequestEmail(
            manager.name,
            user.name,
            leaveType,
            start.toDateString(),
            end.toDateString()
          )
        ).catch((err) => console.error('Leave request email failed:', err.message));
      }
    }

    await logActivity(
      req.user._id,
      'create',
      'Leave',
      leave._id,
      `Applied for ${leaveType} leave: ${start.toDateString()} to ${end.toDateString()}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      leave,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my leaves
// @route   GET /api/leaves/my
// @access  Private
const getMyLeaves = async (req, res, next) => {
  try {
    const leaves = await Leave.find({ user: req.user._id })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leaves.length,
      leaves,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leave balance
// @route   GET /api/leaves/balance
// @access  Private
const getLeaveBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('leaveBalance');

    res.status(200).json({
      success: true,
      leaveBalance: user.leaveBalance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending leaves (admin: all, manager: their team)
// @route   GET /api/leaves/pending
// @access  Admin, Manager
const getPendingLeaves = async (req, res, next) => {
  try {
    const filter = { status: 'pending' };

    if (req.user.role === 'hr') {
      // Manager sees only their team's pending leaves
      const teamMembers = await User.find({
        managerId: req.user._id,
        isActive: true,
      }).select('_id');
      const teamIds = teamMembers.map((m) => m._id);
      filter.user = { $in: teamIds };
    }

    const leaves = await Leave.find(filter)
      .populate('user', 'name email department employeeId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leaves.length,
      leaves,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Review (approve/reject) a leave request
// @route   PUT /api/leaves/:id/review
// @access  Admin, Manager
const reviewLeave = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400);
      return next(new Error('Status must be approved or rejected'));
    }

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      res.status(404);
      return next(new Error('Leave request not found'));
    }

    if (leave.status !== 'pending') {
      res.status(400);
      return next(new Error('Leave request has already been reviewed'));
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    if (reviewNote) {
      leave.reviewNote = reviewNote;
    }

    await leave.save();

    // If approved, deduct from user's leave balance
    if (status === 'approved') {
      const balanceField = `leaveBalance.${leave.leaveType}`;
      await User.findByIdAndUpdate(leave.user, {
        $inc: { [balanceField]: -leave.totalDays },
      });
    }

    // Notify the employee
    const employee = await User.findById(leave.user);
    if (employee) {
      await createNotification(
        employee._id,
        `Leave ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        `Your ${leave.leaveType} leave request has been ${status}`,
        'leave',
        '/leaves/my'
      );

      // Send email to employee
      sendEmail(
        employee.email,
        `Leave ${status === 'approved' ? 'Approved' : 'Rejected'} - AD Workspace`,
        leaveReviewEmail(employee.name, status, reviewNote)
      ).catch((err) => console.error('Leave review email failed:', err.message));
    }

    await logActivity(
      req.user._id,
      'review',
      'Leave',
      leave._id,
      `${status} leave request for user ${leave.user}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      leave,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getLeaveBalance,
  getPendingLeaves,
  reviewLeave,
};
