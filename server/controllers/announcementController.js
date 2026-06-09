const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { createBulkNotifications } = require('../utils/createNotification');
const { logActivity } = require('../utils/logActivity');

// @desc    Get announcements filtered by visibleTo
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = async (req, res, next) => {
  try {
    const { role } = req.user;
    const filter = {};

    // Filter by visibility based on user role
    if (role === 'developer') {
      filter.visibleTo = { $in: ['all', 'developers'] };
    } else if (role === 'hr') {
      filter.visibleTo = { $in: ['all', 'hr'] };
    }
    // admin sees all

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name')
      .sort({ isPinned: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: announcements.length,
      announcements,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Admin, Manager
const createAnnouncement = async (req, res, next) => {
  try {
    req.body.createdBy = req.user._id;

    const announcement = await Announcement.create(req.body);

    // If urgent, create bulk notifications for all active users
    if (announcement.category === 'urgent') {
      const activeUsers = await User.find({ isActive: true }).select('_id');
      const userIds = activeUsers.map((u) => u._id);
      await createBulkNotifications(
        userIds,
        'Urgent Announcement',
        announcement.title,
        'announcement',
        `/announcements`
      );
    }

    await logActivity(
      req.user._id,
      'create',
      'Announcement',
      announcement._id,
      `Created announcement: ${announcement.title}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      announcement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Admin, Manager
const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    if (!announcement) {
      res.status(404);
      return next(new Error('Announcement not found'));
    }

    await logActivity(
      req.user._id,
      'update',
      'Announcement',
      announcement._id,
      `Updated announcement: ${announcement.title}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      announcement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Admin
const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      res.status(404);
      return next(new Error('Announcement not found'));
    }

    await announcement.deleteOne();

    await logActivity(
      req.user._id,
      'delete',
      'Announcement',
      announcement._id,
      `Deleted announcement: ${announcement.title}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle pin status of announcement
// @route   PATCH /api/announcements/:id/pin
// @access  Admin, Manager
const togglePin = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      res.status(404);
      return next(new Error('Announcement not found'));
    }

    announcement.isPinned = !announcement.isPinned;
    await announcement.save();

    res.status(200).json({
      success: true,
      announcement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark announcement as read
// @route   PATCH /api/announcements/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      res.status(404);
      return next(new Error('Announcement not found'));
    }

    if (!announcement.readBy.includes(req.user._id)) {
      announcement.readBy.push(req.user._id);
      await announcement.save();
    }

    res.status(200).json({
      success: true,
      message: 'Announcement marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle emoji reaction on announcement
// @route   PATCH /api/announcements/:id/react
// @access  Private
const reactToAnnouncement = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    if (!emoji) {
      res.status(400);
      return next(new Error('Emoji is required'));
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      res.status(404);
      return next(new Error('Announcement not found'));
    }

    const userId = req.user._id;
    let reaction = announcement.reactions.find(r => r.emoji === emoji);

    if (reaction) {
      const idx = reaction.users.findIndex(u => u.toString() === userId.toString());
      if (idx !== -1) {
        reaction.users.splice(idx, 1);
        if (reaction.users.length === 0) {
          announcement.reactions = announcement.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        reaction.users.push(userId);
      }
    } else {
      announcement.reactions.push({ emoji, users: [userId] });
    }

    await announcement.save();
    await announcement.populate('createdBy', 'name');

    res.status(200).json({ success: true, announcement });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePin,
  markAsRead,
  reactToAnnouncement,
};
