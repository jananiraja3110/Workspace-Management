const Ticket = require('../models/Ticket');
const { createNotification } = require('../utils/createNotification');
const { logActivity } = require('../utils/logActivity');

// @desc    Create ticket
// @route   POST /api/tickets
// @access  Private
const createTicket = async (req, res, next) => {
  try {
    req.body.user = req.user._id;

    const ticket = await Ticket.create(req.body);

    await logActivity(
      req.user._id,
      'create',
      'Ticket',
      ticket._id,
      `Created ticket: ${ticket.subject}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my tickets
// @route   GET /api/tickets/my
// @access  Private
const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id })
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tickets with filters
// @route   GET /api/tickets
// @access  Admin
const getAllTickets = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const tickets = await Ticket.find(filter)
      .populate('user', 'name department')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ticket by ID with comments populated
// @route   GET /api/tickets/:id
// @access  Private
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('user', 'name department')
      .populate('assignedTo', 'name')
      .populate('comments.user', 'name');

    if (!ticket) {
      res.status(404);
      return next(new Error('Ticket not found'));
    }

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign ticket to user
// @route   PUT /api/tickets/:id/assign
// @access  Admin
const assignTicket = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { assignedTo, status: 'in_progress' },
      { new: true, runValidators: true }
    )
      .populate('user', 'name')
      .populate('assignedTo', 'name');

    if (!ticket) {
      res.status(404);
      return next(new Error('Ticket not found'));
    }

    await createNotification(
      assignedTo,
      'Ticket Assigned',
      `You have been assigned ticket ${ticket.ticketId}: ${ticket.subject}`,
      'general',
      `/tickets/${ticket._id}`
    );

    await logActivity(
      req.user._id,
      'assign',
      'Ticket',
      ticket._id,
      `Assigned ticket ${ticket.ticketId} to user`,
      req.ip
    );

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ticket status
// @route   PATCH /api/tickets/:id/status
// @access  Private (admin or assignee)
const updateTicketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404);
      return next(new Error('Ticket not found'));
    }

    // Only admin or assignee can update status
    const isAdmin = req.user.role === 'admin';
    const isAssignee = ticket.assignedTo && ticket.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isAssignee) {
      res.status(403);
      return next(new Error('Not authorized to update this ticket status'));
    }

    ticket.status = status;

    if (status === 'resolved') {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    // Notify ticket creator
    await createNotification(
      ticket.user,
      'Ticket Updated',
      `Ticket ${ticket.ticketId} status changed to ${status}`,
      'general',
      `/tickets/${ticket._id}`
    );

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment to ticket
// @route   POST /api/tickets/:id/comment
// @access  Private
const addComment = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404);
      return next(new Error('Ticket not found'));
    }

    ticket.comments.push({
      user: req.user._id,
      text: req.body.text,
    });

    await ticket.save();

    await ticket.populate('comments.user', 'name');

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getAllTickets,
  getTicketById,
  assignTicket,
  updateTicketStatus,
  addComment,
};
