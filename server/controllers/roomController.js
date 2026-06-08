const MeetingRoom = require('../models/MeetingRoom');
const { logActivity } = require('../utils/logActivity');

// @desc    Get all active meeting rooms
// @route   GET /api/rooms
// @access  Private
const getRooms = async (req, res, next) => {
  try {
    const rooms = await MeetingRoom.find({ isActive: true }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create meeting room
// @route   POST /api/rooms
// @access  Admin
const createRoom = async (req, res, next) => {
  try {
    const room = await MeetingRoom.create(req.body);

    await logActivity(
      req.user._id,
      'create',
      'MeetingRoom',
      room._id,
      `Created meeting room: ${room.name}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      room,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update meeting room
// @route   PUT /api/rooms/:id
// @access  Admin
const updateRoom = async (req, res, next) => {
  try {
    const room = await MeetingRoom.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!room) {
      res.status(404);
      return next(new Error('Room not found'));
    }

    await logActivity(
      req.user._id,
      'update',
      'MeetingRoom',
      room._id,
      `Updated meeting room: ${room.name}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete meeting room (soft delete)
// @route   DELETE /api/rooms/:id
// @access  Admin
const deleteRoom = async (req, res, next) => {
  try {
    const room = await MeetingRoom.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!room) {
      res.status(404);
      return next(new Error('Room not found'));
    }

    await logActivity(
      req.user._id,
      'delete',
      'MeetingRoom',
      room._id,
      `Deactivated meeting room: ${room.name}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Room deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
};
