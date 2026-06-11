const TimeEntry = require('../models/TimeEntry');
const Task = require('../models/Task');

function toUtcDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d;
}

function mondayOf(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function parseDuration(raw) {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim().toLowerCase();
  if (!s || s.includes('-')) return null;

  if (/[hm]/.test(s)) {
    let total = 0;
    const hm = s.match(/(\d+(?:\.\d+)?)\s*h/);
    const mm = s.match(/(\d+(?:\.\d+)?)\s*m/);
    if (hm) total += parseFloat(hm[1]) * 60;
    if (mm) total += parseFloat(mm[1]);
    const mins = Math.round(total);
    return mins > 0 ? mins : null;
  }

  const num = parseFloat(s);
  if (!isFinite(num)) return null;
  const mins = Math.round(num * 60);
  return mins > 0 ? mins : null;
}

// GET /api/timeentries?week=YYYY-MM-DD
const getEntries = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const weekParam = req.query.week;
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(Date.now() + istOffset);
    const weekStart = weekParam ? mondayOf(new Date(`${weekParam}T00:00:00Z`)) : mondayOf(istNow);
    const weekEnd = new Date(weekStart.getTime());
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const entries = await TimeEntry.find({
      user: userId,
      date: { $gte: weekStart, $lt: weekEnd },
    })
      .populate('task', 'title status')
      .sort({ date: 1, createdAt: 1 });

    res.json({ success: true, entries });
  } catch (err) {
    next(err);
  }
};

// GET /api/timeentries/running
const getRunning = async (req, res, next) => {
  try {
    const entry = await TimeEntry.findOne({
      user: req.user._id,
      endedAt: null,
      startedAt: { $ne: null },
    })
      .populate('task', 'title')
      .sort({ startedAt: -1 });

    res.json({ success: true, running: entry || null });
  } catch (err) {
    next(err);
  }
};

// GET /api/timeentries/tasks  — tasks picker (user's assigned tasks)
const getTasksForPicker = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const tasks = await Task.find({
      $or: [{ assignedTo: userId }, { assignedBy: userId }],
    })
      .select('title status')
      .populate('space', 'name')
      .sort({ title: 1 });

    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
};

// POST /api/timeentries/start
const startTimer = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const taskId = req.body.taskId || null;
    const now = new Date();

    // stop any running timers
    const running = await TimeEntry.find({
      user: userId,
      endedAt: null,
      startedAt: { $ne: null },
    });
    for (const e of running) {
      const startedAt = e.startedAt || now;
      const mins = Math.max(0, Math.round((now - startedAt) / 60000));
      await TimeEntry.findByIdAndUpdate(e._id, { endedAt: now, minutes: mins });
    }

    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const entry = await TimeEntry.create({
      user: userId,
      task: taskId || null,
      minutes: 0,
      startedAt: now,
      endedAt: null,
      date: todayUtc,
    });

    const populated = await TimeEntry.findById(entry._id).populate('task', 'title');
    res.json({ success: true, entry: populated });
  } catch (err) {
    next(err);
  }
};

// POST /api/timeentries/stop
const stopTimer = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const entry = await TimeEntry.findOne({
      user: userId,
      endedAt: null,
      startedAt: { $ne: null },
    }).sort({ startedAt: -1 });

    if (!entry) return res.status(404).json({ success: false, message: 'No running timer' });

    const now = new Date();
    const startedAt = entry.startedAt || now;
    const minutes = Math.max(1, Math.round((now - startedAt) / 60000));

    const updated = await TimeEntry.findByIdAndUpdate(
      entry._id,
      { endedAt: now, minutes },
      { new: true }
    ).populate('task', 'title');

    res.json({ success: true, entry: updated });
  } catch (err) {
    next(err);
  }
};

// PUT /api/timeentries/cell  — set total time for (task, date) cell
const setCell = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { taskId, date, value } = req.body;

    if (!date) return res.status(400).json({ success: false, message: 'Date required' });
    const day = toUtcDate(date);
    if (isNaN(day.getTime())) return res.status(400).json({ success: false, message: 'Invalid date' });

    const raw = (value || '').trim();
    const isClear = raw === '' || /^0\s*[hm]?$/i.test(raw);
    let minutes = 0;
    if (!isClear) {
      const parsed = parseDuration(raw);
      if (parsed === null) return res.status(400).json({ success: false, message: 'Invalid duration. Use "2h", "90m", "1h 30m", or "1.5"' });
      minutes = parsed;
    }

    // delete committed (non-running) entries for this cell
    await TimeEntry.deleteMany({
      user: userId,
      task: taskId || null,
      date: day,
      $or: [{ startedAt: null }, { endedAt: { $ne: null } }],
    });

    if (minutes > 0) {
      await TimeEntry.create({
        user: userId,
        task: taskId || null,
        minutes,
        date: day,
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/timeentries/:id
const deleteEntry = async (req, res, next) => {
  try {
    const entry = await TimeEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

    if (entry.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await entry.deleteOne();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getEntries, getRunning, getTasksForPicker, startTimer, stopTimer, setCell, deleteEntry };
