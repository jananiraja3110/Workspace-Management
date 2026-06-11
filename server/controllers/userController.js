const User = require('../models/User');
const { generateEmployeeId } = require('../utils/generateId');
const { sendEmail } = require('../utils/sendEmail');
const { welcomeEmail } = require('../utils/emailTemplates');
const { createNotification } = require('../utils/createNotification');
const { logActivity } = require('../utils/logActivity');
const upload = require('../middleware/upload');

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

    // Capture plaintext password before Mongoose hashes it
    const plainPassword = password;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isActive === false) {
        // Reactivate the soft-deleted user with new details
        existingUser.name        = name;
        existingUser.password    = password;
        existingUser.role        = role || existingUser.role;
        existingUser.department  = department || existingUser.department;
        existingUser.designation = designation || existingUser.designation;
        existingUser.phone       = phone || existingUser.phone;
        existingUser.dateOfBirth = dateOfBirth || existingUser.dateOfBirth;
        existingUser.joiningDate = joiningDate || existingUser.joiningDate;
        existingUser.managerId   = managerId || null;
        existingUser.isActive    = true;
        existingUser.mustChangePassword = true;
        await existingUser.save();

        sendEmail(email, 'Welcome to AD Workspace', welcomeEmail(name, email, password))
          .catch(err => console.error('Welcome email failed:', err.message));

        const safe = existingUser.toObject();
        delete safe.password;
        return res.status(200).json({ success: true, user: safe });
      }
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
      welcomeEmail(name, email, plainPassword)
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
    const allowed = ['name', 'email', 'phone', 'department', 'position', 'role', 'designation', 'dateOfBirth', 'joiningDate', 'managerId', 'profileImage', 'address', 'emergencyContact', 'isActive'];
    const updates = {};
    allowed.forEach(k => { if (k in req.body) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
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

// @desc    Update own profile (employee self-service)
// @route   PUT /api/users/me
// @access  Any authenticated user
const updateMe = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'profileImage', 'address', 'emergencyContact'];
    const updates = {};
    allowed.forEach(k => { if (k in req.body) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.status(200).json({ success: true, user });
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

// @desc    Upload user avatar
// @route   PUT /api/users/:id/avatar
// @access  Owner or Admin
const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      return next(new Error('No file uploaded'));
    }

    const isOwner = req.user._id.toString() === req.params.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403);
      return next(new Error('Not authorized to update this avatar'));
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }

    user.avatar = `/uploads/${req.file.filename}`;
    await user.save();

    res.status(200).json({
      success: true,
      user,
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
  updateMe,
  deleteUser,
  getTeam,
  updateAvatar,
};
