const Standup = require('../models/Standup');
const User = require('../models/User');

// @desc    Submit standup for today
// @route   POST /api/standups
// @access  Private
const submitStandup = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Standup.findOne({
      user: req.user._id,
      date: today,
    });

    if (existing) {
      res.status(400);
      return next(new Error('Standup already submitted for today'));
    }

    const standup = await Standup.create({
      user: req.user._id,
      date: today,
      today: req.body.today,
      blockers: req.body.blockers,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      hoursWorked: req.body.hoursWorked,
      tasksWorked: req.body.tasksWorked,
      status: req.body.status || 'in-progress',
    });

    res.status(201).json({
      success: true,
      standup,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my standups
// @route   GET /api/standups/my
// @access  Private
const getMyStandups = async (req, res, next) => {
  try {
    const filter = { user: req.user._id };

    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    const standups = await Standup.find(filter).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: standups.length,
      standups,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's standup
// @route   GET /api/standups/today
// @access  Private
const getTodayStandup = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const standup = await Standup.findOne({
      user: req.user._id,
      date: today,
    });

    res.status(200).json({
      success: true,
      standup: standup || null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team standups for a specific date
// @route   GET /api/standups/team
// @access  Admin, Manager
const getTeamStandups = async (req, res, next) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    date.setHours(0, 0, 0, 0);

    const filter = { date };

    // Manager sees only their team
    if (req.user.role === 'hr') {
      const teamMembers = await User.find({ managerId: req.user._id }).select('_id');
      const teamIds = teamMembers.map((m) => m._id);
      teamIds.push(req.user._id);
      filter.user = { $in: teamIds };
    }

    const standups = await Standup.find(filter)
      .populate('user', 'name department designation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: standups.length,
      standups,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update today's standup
// @route   PUT /api/standups/:id
// @access  Private (owner only)
const updateStandup = async (req, res, next) => {
  try {
    const standup = await Standup.findById(req.params.id);

    if (!standup) {
      res.status(404);
      return next(new Error('Standup not found'));
    }

    if (standup.user.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Not authorized to update this standup'));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (standup.date.getTime() !== today.getTime()) {
      res.status(400);
      return next(new Error('Can only update today\'s standup'));
    }

    standup.today = req.body.today || standup.today;
    standup.blockers = req.body.blockers !== undefined ? req.body.blockers : standup.blockers;
    if (req.body.startTime !== undefined) standup.startTime = req.body.startTime;
    if (req.body.endTime !== undefined) standup.endTime = req.body.endTime;
    if (req.body.hoursWorked !== undefined) standup.hoursWorked = req.body.hoursWorked;
    if (req.body.tasksWorked !== undefined) standup.tasksWorked = req.body.tasksWorked;
    if (req.body.status !== undefined) standup.status = req.body.status;

    await standup.save();

    res.status(200).json({
      success: true,
      standup,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitStandup,
  getMyStandups,
  getTodayStandup,
  getTeamStandups,
  updateStandup,
};
