const ActivityLog = require('../models/ActivityLog');

const logActivity = async (userId, action, entity, entityId, details, ipAddress = '') => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      entity,
      entityId,
      details,
      ipAddress,
    });
  } catch (error) {
    console.error('Activity log error:', error.message);
  }
};

module.exports = { logActivity };
