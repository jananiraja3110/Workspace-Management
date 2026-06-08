const Event = require('../models/Event');
const { logActivity } = require('../utils/logActivity');

// @desc    Get events (filtered by visibleTo based on user role)
// @route   GET /api/events
// @access  Private
const getEvents = async (req, res, next) => {
  try {
    const { role } = req.user;

    // Users can see events visible to 'all' or their specific role
    const filter = {
      visibleTo: { $in: ['all', role] },
    };

    // Month/year filter
    if (req.query.month && req.query.year) {
      const month = parseInt(req.query.month) - 1; // JS months are 0-indexed
      const year = parseInt(req.query.year);
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      filter.date = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (req.query.year) {
      const year = parseInt(req.query.year);
      filter.date = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    }

    const events = await Event.find(filter)
      .populate('createdBy', 'name')
      .sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create event
// @route   POST /api/events
// @access  Admin, Manager
const createEvent = async (req, res, next) => {
  try {
    req.body.createdBy = req.user._id;

    const event = await Event.create(req.body);

    await logActivity(
      req.user._id,
      'create',
      'Event',
      event._id,
      `Created event: ${event.title}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      event,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Admin, Manager
const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name');

    if (!event) {
      res.status(404);
      return next(new Error('Event not found'));
    }

    await logActivity(
      req.user._id,
      'update',
      'Event',
      event._id,
      `Updated event: ${event.title}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      event,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Admin
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404);
      return next(new Error('Event not found'));
    }

    await event.deleteOne();

    await logActivity(
      req.user._id,
      'delete',
      'Event',
      event._id,
      `Deleted event: ${event.title}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
