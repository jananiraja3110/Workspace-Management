const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { generateEmployeeId } = require('../utils/generateId');
const { sendEmail } = require('../utils/sendEmail');
const { welcomeEmail, resetPasswordEmail } = require('../utils/emailTemplates');

// Helper: generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Admin (or first-user seed)
const register = async (req, res, next) => {
  try {
    const { email, password, name, role, department, designation, phone, dateOfBirth, joiningDate } = req.body;

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
      mustChangePassword: true,
    });

    const token = generateToken(user);

    // Send welcome email with credentials (non-blocking)
    sendEmail(
      email,
      'Welcome to AD Workspace',
      welcomeEmail(name, email, password)
    ).catch((err) => console.error('Welcome email failed:', err.message));

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      token,
      user: userObj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      return next(new Error('Please provide email and password'));
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      res.status(401);
      return next(new Error('Invalid credentials'));
    }

    if (!user.isActive) {
      res.status(401);
      return next(new Error('Account has been deactivated'));
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      return next(new Error('Invalid credentials'));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user);

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      success: true,
      token,
      user: userObj,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400);
      return next(new Error('Please provide current password and new password'));
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(401);
      return next(new Error('Current password is incorrect'));
    }

    // Update password
    user.password = newPassword;
    user.mustChangePassword = false;
    user.onboardingCompleted = false; // so tour shows after password change
    await user.save();

    // Return updated user (without password)
    const updatedUser = await User.findById(user._id).select('-password');

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password - generate reset token
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      return next(new Error('Please provide an email'));
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      return next(new Error('No user found with that email'));
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and save to user
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    // Send reset email (non-blocking, optional)
    sendEmail(
      email,
      'Password Reset - AD Workspace',
      resetPasswordEmail(user.name, resetToken)
    ).catch((err) => console.error('Reset email failed:', err.message));

    res.status(200).json({
      success: true,
      message: 'Password reset token generated',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
};
