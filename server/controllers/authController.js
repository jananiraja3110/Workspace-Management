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

// @desc    Login step 1 — verify credentials, send OTP
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      return next(new Error('Please provide email and password'));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      res.status(401);
      return next(new Error('Invalid credentials'));
    }

    if (!user.isActive) {
      res.status(401);
      return next(new Error('Account has been deactivated'));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      return next(new Error('Invalid credentials'));
    }

    // Generate 6-digit OTP, expire in 10 min
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode   = otp;
    user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    sendEmail(
      email,
      'Your AD Workspace Login OTP',
      `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#4f46e5;margin-bottom:8px">Login Verification</h2>
        <p style="color:#64748b">Hi ${user.name}, use the OTP below to complete your login.</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1e293b;text-align:center;padding:24px 0">${otp}</div>
        <p style="color:#94a3b8;font-size:13px">This OTP is valid for <b>10 minutes</b>. Do not share it with anyone.</p>
      </div>`
    ).catch(err => console.error('OTP email failed:', err.message));

    res.status(200).json({ success: true, otpSent: true, email });
  } catch (error) {
    next(error);
  }
};

// @desc    Login step 2 — verify OTP, return JWT
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      return next(new Error('Email and OTP are required'));
    }

    const user = await User.findOne({ email }).select('+otpCode +otpExpire');

    if (!user || !user.otpCode) {
      res.status(401);
      return next(new Error('OTP not requested or already used'));
    }

    if (new Date() > user.otpExpire) {
      res.status(401);
      return next(new Error('OTP has expired. Please login again'));
    }

    if (user.otpCode !== otp.trim()) {
      res.status(401);
      return next(new Error('Invalid OTP'));
    }

    // Clear OTP
    user.otpCode   = undefined;
    user.otpExpire = undefined;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user);
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.otpCode;
    delete userObj.otpExpire;

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
  verifyOtp,
  getMe,
  changePassword,
  forgotPassword,
};
