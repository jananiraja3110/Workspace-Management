const RoomBooking = require('../models/RoomBooking');
const { logActivity } = require('../utils/logActivity');

// @desc    Create room booking with conflict check
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res, next) => {
  try {
    const { room, date, startTime, endTime } = req.body;

    // Check for conflicts (same room, same date, overlapping times)
    const conflict = await RoomBooking.findOne({
      room,
      date: new Date(date),
      status: 'confirmed',
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
      ],
    });

    if (conflict) {
      res.status(409);
      return next(new Error('Room is already booked for the selected time slot'));
    }

    const booking = await RoomBooking.create({
      ...req.body,
      bookedBy: req.user._id,
    });

    await logActivity(
      req.user._id,
      'create',
      'RoomBooking',
      booking._id,
      `Booked room for ${date} ${startTime}-${endTime}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my bookings
// @route   GET /api/bookings/my
// @access  Private
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await RoomBooking.find({ bookedBy: req.user._id })
      .populate('room', 'name location')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bookings for a specific room on a date
// @route   GET /api/bookings/room/:roomId
// @access  Private
const getRoomBookings = async (req, res, next) => {
  try {
    const filter = {
      room: req.params.roomId,
      status: 'confirmed',
    };

    if (req.query.date) {
      const date = new Date(req.query.date);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.date = { $gte: date, $lt: nextDay };
    }

    const bookings = await RoomBooking.find(filter)
      .populate('bookedBy', 'name')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings for today
// @route   GET /api/bookings/today
// @access  Private
const getTodayBookings = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookings = await RoomBooking.find({
      date: { $gte: today, $lt: tomorrow },
      status: 'confirmed',
    })
      .populate('room', 'name location')
      .populate('bookedBy', 'name')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel booking
// @route   PATCH /api/bookings/:id/cancel
// @access  Private (owner only)
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await RoomBooking.findById(req.params.id);

    if (!booking) {
      res.status(404);
      return next(new Error('Booking not found'));
    }

    if (booking.bookedBy.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Not authorized to cancel this booking'));
    }

    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getRoomBookings,
  getTodayBookings,
  cancelBooking,
};
