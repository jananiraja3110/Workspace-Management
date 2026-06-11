const TimesheetWeek = require('../models/TimesheetWeek');
const TimeEntry = require('../models/TimeEntry');

function mondayOf(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const diff = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function toUtcDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`);
}

// GET /api/timesheetweeks/my?week=YYYY-MM-DD
const getMyWeek = async (req, res, next) => {
  try {
    const weekStart = req.query.week
      ? mondayOf(toUtcDate(req.query.week))
      : mondayOf(new Date(Date.now() + 5.5 * 3600000));

    let doc = await TimesheetWeek.findOne({ user: req.user._id, weekStart });
    if (!doc) {
      doc = await TimesheetWeek.create({ user: req.user._id, weekStart, status: 'draft' });
    }
    res.json({ success: true, week: doc });
  } catch (err) { next(err); }
};

// POST /api/timesheetweeks/submit
const submitWeek = async (req, res, next) => {
  try {
    const weekStart = req.body.week
      ? mondayOf(toUtcDate(req.body.week))
      : mondayOf(new Date(Date.now() + 5.5 * 3600000));

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const entries = await TimeEntry.find({
      user: req.user._id,
      date: { $gte: weekStart, $lt: weekEnd },
      $or: [{ startedAt: null }, { endedAt: { $ne: null } }],
    });
    const totalMinutes = entries.reduce((s, e) => s + (e.minutes || 0), 0);

    const doc = await TimesheetWeek.findOneAndUpdate(
      { user: req.user._id, weekStart },
      { status: 'pending', submittedAt: new Date(), totalMinutes, reviewNote: '', reviewedBy: null, reviewedAt: null },
      { upsert: true, new: true }
    );
    res.json({ success: true, week: doc });
  } catch (err) { next(err); }
};

// POST /api/timesheetweeks/recall
const recallWeek = async (req, res, next) => {
  try {
    const weekStart = req.body.week
      ? mondayOf(toUtcDate(req.body.week))
      : mondayOf(new Date(Date.now() + 5.5 * 3600000));

    const doc = await TimesheetWeek.findOne({ user: req.user._id, weekStart });
    if (!doc || doc.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Can only recall a pending submission' });
    }
    doc.status = 'draft';
    doc.submittedAt = null;
    await doc.save();
    res.json({ success: true, week: doc });
  } catch (err) { next(err); }
};

// GET /api/timesheetweeks/pending  — admin/HR
const getPending = async (req, res, next) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const weeks = await TimesheetWeek.find({ status: 'pending' })
      .populate('user', 'name email role designation avatar')
      .sort({ submittedAt: 1 });
    res.json({ success: true, weeks });
  } catch (err) { next(err); }
};

// GET /api/timesheetweeks/all  — admin/HR: all weeks (for history)
const getAllWeeks = async (req, res, next) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const weeks = await TimesheetWeek.find(filter)
      .populate('user', 'name email role designation avatar')
      .populate('reviewedBy', 'name')
      .sort({ submittedAt: -1 })
      .limit(200);
    res.json({ success: true, weeks });
  } catch (err) { next(err); }
};

// POST /api/timesheetweeks/:id/approve
const approveWeek = async (req, res, next) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const doc = await TimesheetWeek.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: req.body.note || '' },
      { new: true }
    ).populate('user', 'name email role designation avatar');
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, week: doc });
  } catch (err) { next(err); }
};

// POST /api/timesheetweeks/:id/reject
const rejectWeek = async (req, res, next) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (!req.body.note?.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection note required' });
    }
    const doc = await TimesheetWeek.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: req.body.note },
      { new: true }
    ).populate('user', 'name email role designation avatar');
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, week: doc });
  } catch (err) { next(err); }
};

module.exports = { getMyWeek, submitWeek, recallWeek, getPending, getAllWeeks, approveWeek, rejectWeek };
