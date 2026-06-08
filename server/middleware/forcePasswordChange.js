const checkPasswordChange = (req, res, next) => {
  if (req.user.mustChangePassword) {
    // Allow access to change password and get profile routes only
    const allowedPaths = ['/api/auth/change-password', '/api/auth/me'];
    if (allowedPaths.includes(req.originalUrl)) {
      return next();
    }
    res.status(403);
    return next(new Error('You must change your password before accessing this resource'));
  }
  next();
};

module.exports = { checkPasswordChange };
