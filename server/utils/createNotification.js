const Notification = require('../models/Notification');

const createNotification = async (userId, title, message, type = 'general', link = '') => {
  try {
    await Notification.create({
      user: userId,
      title,
      message,
      type,
      link,
    });
  } catch (error) {
    console.error('Notification error:', error.message);
  }
};

const createBulkNotifications = async (userIds, title, message, type = 'general', link = '') => {
  try {
    const notifications = userIds.map((userId) => ({
      user: userId,
      title,
      message,
      type,
      link,
    }));
    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Bulk notification error:', error.message);
  }
};

module.exports = { createNotification, createBulkNotifications };
