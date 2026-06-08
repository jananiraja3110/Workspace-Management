const User = require('../models/User');
const { generateEmployeeId } = require('../utils/generateId');
const { sendEmail } = require('../utils/sendEmail');
const { welcomeEmail } = require('../utils/emailTemplates');
const { createNotification } = require('../utils/createNotification');
const { logActivity } = require('../utils/logActivity');

// @desc    Get all users
// @route   GET /api/users
// @access  Admin
const getUsers = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.department) {
      filter.department = req.query.department;
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const users = await User.find(filter)
      .populate('managerId', 'name')
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Admin, Manager
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('managerId', 'name')
      .select('-password');

    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new user
// @route   POST /api/users
// @access  Admin
const createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      designation,
      phone,
      dateOfBirth,
      joiningDate,
      managerId,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400);
      return next(new Error('User with this email already exists'));
    }

    // Auto-generate employee ID
    const employeeId = await generateEmployeeId(role || 'developer');

    const user = await User.create({
      employeeId,
      name,
      email,
      password,
      role: role || 'developer',
      department,
      designation,
      phone,
      dateOfBirth,
      joiningDate,
      managerId: managerId || null,
      mustChangePassword: true,
    });

    // Send welcome email (non-blocking)
    sendEmail(
      email,
      'Welcome to AD Workspace',
      welcomeEmail(name, email, password)
    ).catch((err) => console.error('Welcome email failed:', err.message));

    // Log activity
    await logActivity(
      req.user._id,
      'create',
      'User',
      user._id,
      `Created user: ${name} (${email})`,
      req.ip
    );

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      user: userObj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user fields (not password)
// @route   PUT /api/users/:id
// @access  Admin
const updateUser = async (req, res, next) => {
  try {
    // Remove password from update fields
    const updateFields = { ...req.body };
    delete updateFields.password;

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }

    await logActivity(
      req.user._id,
      'update',
      'User',
      user._id,
      `Updated user: ${user.name}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete user (set isActive: false)
// @route   DELETE /api/users/:id
// @access  Admin
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }

    await logActivity(
      req.user._id,
      'delete',
      'User',
      user._id,
      `Deactivated user: ${user.name}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team members (employees where managerId === req.user.id)
// @route   GET /api/users/team
// @access  Manager
const getTeam = async (req, res, next) => {
  try {
    const team = await User.find({ managerId: req.user._id, isActive: true })
      .select('-password')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: team.length,
      users: team,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getTeam,
};
