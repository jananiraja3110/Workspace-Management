const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verifyOtp,
  getMe,
  changePassword,
  forgotPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const User = require('../models/User');

// POST /register - admin only, but allow if no users exist (initial seed)
router.post('/register', async (req, res, next) => {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    // No users yet - allow registration without auth (seed scenario)
    return register(req, res, next);
  }
  // Otherwise require auth + admin role
  protect(req, res, (err) => {
    if (err) return next(err);
    authorize('admin')(req, res, (err) => {
      if (err) return next(err);
      register(req, res, next);
    });
  });
});

// POST /login - public (step 1: verify credentials, send OTP)
router.post('/login', login);

// POST /verify-otp - public (step 2: verify OTP, return JWT)
router.post('/verify-otp', verifyOtp);

// GET /me - protected
router.get('/me', protect, getMe);

// PUT /change-password - protected
router.put('/change-password', protect, changePassword);

// POST /forgot-password - public
router.post('/forgot-password', forgotPassword);

module.exports = router;
