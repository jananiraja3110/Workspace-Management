const mongoose = require('mongoose');
const Message = require('../models/Message');
const { createNotification } = require('../utils/createNotification');

// @desc    Get conversations (unique users I've messaged with)
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const conversations = await Message.aggregate([
      {
        // Find all messages where I'm sender or receiver
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      {
        // Sort by most recent first
        $sort: { createdAt: -1 },
      },
      {
        // Determine the "other" user in the conversation
        $addFields: {
          otherUser: {
            $cond: {
              if: { $eq: ['$sender', userId] },
              then: '$receiver',
              else: '$sender',
            },
          },
        },
      },
      {
        // Group by the other user
        $group: {
          _id: '$otherUser',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', userId] },
                    { $eq: ['$read', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        // Lookup user details
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $project: {
          user: {
            _id: '$userDetails._id',
            name: '$userDetails.name',
            email: '$userDetails.email',
            department: '$userDetails.department',
            designation: '$userDetails.designation',
          },
          lastMessage: {
            _id: '$lastMessage._id',
            content: '$lastMessage.content',
            sender: '$lastMessage.sender',
            createdAt: '$lastMessage.createdAt',
            read: '$lastMessage.read',
          },
          unreadCount: 1,
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get message thread with a specific user
// @route   GET /api/messages/with/:userId
// @access  Private
const getThread = async (req, res, next) => {
  try {
    const myId = req.user._id;
    const otherId = new mongoose.Types.ObjectId(req.params.userId);

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherId },
        { sender: otherId, receiver: myId },
      ],
    })
      .populate('sender', 'name')
      .populate('receiver', 'name')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { receiver, content } = req.body;

    if (!receiver) {
      res.status(400);
      return next(new Error('Receiver is required'));
    }

    if (!content && !req.file) {
      res.status(400);
      return next(new Error('Message content or file is required'));
    }

    const msgData = {
      sender: req.user._id,
      receiver,
    };

    if (content) msgData.content = content;

    if (req.file) {
      msgData.fileName = req.file.originalname;
      msgData.filePath = req.file.path.replace(/\\/g, '/');
      msgData.fileType = req.file.mimetype;
    }

    const message = await Message.create(msgData);

    // Send notification to receiver
    await createNotification(
      receiver,
      'New Message',
      `${req.user.name} sent you a message`,
      'message',
      `/messages/${req.user._id}`
    );

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name')
      .populate('receiver', 'name');

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all messages from a user as read
// @route   PATCH /api/messages/read/:userId
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const senderId = req.params.userId;

    await Message.updateMany(
      {
        sender: senderId,
        receiver: req.user._id,
        read: false,
      },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get total unread message count
// @route   GET /api/messages/unread-count
// @access  Private
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      read: false,
    });

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    React to a message
// @route   POST /api/messages/:id/react
// @access  Private
const reactToMessage = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    if (!emoji) {
      res.status(400);
      return next(new Error('Emoji is required'));
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      res.status(404);
      return next(new Error('Message not found'));
    }

    // Check if user already reacted with this emoji — toggle off
    const existingIdx = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingIdx > -1) {
      message.reactions.splice(existingIdx, 1);
    } else {
      // Remove any previous reaction from this user, add new one
      message.reactions = message.reactions.filter(
        (r) => r.user.toString() !== req.user._id.toString()
      );
      message.reactions.push({ emoji, user: req.user._id });
    }

    await message.save();

    res.status(200).json({ success: true, reactions: message.reactions });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  getThread,
  sendMessage,
  markAsRead,
  getUnreadCount,
  reactToMessage,
};
