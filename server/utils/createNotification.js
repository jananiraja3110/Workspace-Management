const Notification = require('../models/Notification');

let _pushFn = null;
const setPushFn = (fn) => { _pushFn = fn; };

const createNotification = async (userId, title, message, type = 'general', link = '') => {
  try {
    const notif = await Notification.create({ user: userId, title, message, type, link });
    if (_pushFn) _pushFn(userId, { _id: notif._id, title, message, type, link, read: false, createdAt: notif.createdAt });
  } catch (error) {
    console.error('Notification error:', error.message);
  }
};

const createBulkNotifications = async (userIds, title, message, type = 'general', link = '') => {
  try {
    const notifications = userIds.map((userId) => ({ user: userId, title, message, type, link }));
    await Notification.insertMany(notifications);
    if (_pushFn) userIds.forEach(uid => _pushFn(uid, { title, message, type, link, read: false }));
  } catch (error) {
    console.error('Bulk notification error:', error.message);
  }
};

module.exports = { createNotification, createBulkNotifications, setPushFn };
