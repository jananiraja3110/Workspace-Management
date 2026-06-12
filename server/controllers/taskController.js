const path = require('path');
const Task = require('../models/Task');
const User = require('../models/User');
const TimeEntry = require('../models/TimeEntry');
const { createNotification } = require('../utils/createNotification');
const { logActivity } = require('../utils/logActivity');
const { sendEmail } = require('../utils/sendEmail');
const { taskAssignedEmail } = require('../utils/emailTemplates');

const populateTask = (query) =>
  query
    .populate('assignedTo', 'name')
    .populate('assignedBy', 'name')
    .populate('project', 'name')
    .populate('space', 'name color icon')
    .populate('watchers', 'name')
    .populate('subtasks.assignedTo', 'name')
    .populate('comments.user', 'name');

// @desc    Get tasks based on user role
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res, next) => {
  try {
    let filter = {};
    const { role, _id } = req.user;

    if (role === 'admin') {
      // sees all
    } else if (role === 'hr') {
      filter = { $or: [{ assignedBy: _id }, { assignedTo: _id }] };
    } else {
      filter = { $or: [{ assignedTo: _id }, { watchers: _id }] };
    }

    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.project)  filter.project  = req.query.project;
    if (req.query.space)    filter.space    = req.query.space;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      populateTask(Task.find(filter)).sort({ status: 1, order: 1, createdAt: -1 }).limit(limit).skip(skip),
      Task.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, tasks, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res, next) => {
  try {
    const task = await populateTask(Task.findById(req.params.id));
    if (!task) { res.status(404); return next(new Error('Task not found')); }
    res.status(200).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Admin, HR
const createTask = async (req, res, next) => {
  try {
    req.body.assignedBy = req.user._id;
    // normalize assignedTo — ensure array, filter empty strings/nulls
    if (!req.body.assignedTo) {
      req.body.assignedTo = [];
    } else if (!Array.isArray(req.body.assignedTo)) {
      req.body.assignedTo = [req.body.assignedTo];
    }
    req.body.assignedTo = req.body.assignedTo.filter(id => id && id !== '');

    const task = await Task.create(req.body);

    // Notify all assignees
    if (task.assignedTo?.length) {
      await Promise.all(task.assignedTo.map(uid =>
        createNotification(uid, 'New Task Assigned', `You have been assigned: ${task.title}`, 'task', `/tasks`)
      ));
      const assigneeIds = task.assignedTo.map(a => a._id || a);
      const assignees = await User.find({ _id: { $in: assigneeIds } }).select('name email');
      for (const assignee of assignees) {
        sendEmail(assignee.email, 'New Task Assigned - AD Workspace', taskAssignedEmail(assignee.name, task.title, req.user.name))
          .catch((err) => console.error('Task email failed:', err.message));
      }
    }

    await logActivity(req.user._id, 'create', 'Task', task._id, `Created task: ${task.title}`, req.ip);

    const populated = await populateTask(Task.findById(task._id));
    res.status(201).json({ success: true, task: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Admin, HR (or assignee for status)
const updateTask = async (req, res, next) => {
  try {
    const isAdminOrHR = req.user.role === 'admin' || req.user.role === 'hr';
    const allowed = isAdminOrHR
      ? ['title', 'description', 'status', 'priority', 'startDate', 'dueDate', 'assignedTo', 'space', 'timeEstimate', 'order']
      : ['status']; // non-admin/HR can only change status
    const updates = {};
    allowed.forEach(k => { if (k in req.body) updates[k] = req.body[k]; });

    if (!updates.assignedTo) {
      // leave unchanged
    } else if (!Array.isArray(updates.assignedTo)) {
      updates.assignedTo = [updates.assignedTo];
    }
    if (Array.isArray(updates.assignedTo)) {
      updates.assignedTo = updates.assignedTo.filter(id => id && id !== '');
    }

    const task = await populateTask(
      Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    );

    if (!task) { res.status(404); return next(new Error('Task not found')); }

    await logActivity(req.user._id, 'update', 'Task', task._id, `Updated task: ${task.title}`, req.ip);

    res.status(200).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder tasks within/across columns
// @route   PATCH /api/tasks/reorder
// @access  Private
const reorderTasks = async (req, res, next) => {
  try {
    const { updates } = req.body; // [{ id, status, order }]
    if (!updates?.length) return res.status(200).json({ success: true });

    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ success: false, message: 'Not authorized to reorder tasks' });
    }

    const ops = updates.map(({ id, status, order }) => ({
      updateOne: { filter: { _id: id }, update: { $set: { status, order } } },
    }));
    await Task.bulkWrite(ops);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Add/remove watcher
// @route   PATCH /api/tasks/:id/watch
// @access  Private
const toggleWatch = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) { res.status(404); return next(new Error('Task not found')); }

    const uid = req.user._id.toString();
    const isWatching = task.watchers.map(w => w.toString()).includes(uid);

    if (isWatching) {
      task.watchers = task.watchers.filter(w => w.toString() !== uid);
    } else {
      task.watchers.push(req.user._id);
    }
    await task.save();

    const populated = await populateTask(Task.findById(task._id));
    res.status(200).json({ success: true, watching: !isWatching, task: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Add subtask
// @route   POST /api/tasks/:id/subtasks
// @access  Admin, HR
const addSubtask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) { res.status(404); return next(new Error('Task not found')); }

    if (!req.body.title?.trim()) { res.status(400); return next(new Error('Subtask title is required')); }
    task.subtasks.push({ title: req.body.title.trim(), assignedTo: req.body.assignedTo || null });
    await task.save();

    const populated = await populateTask(Task.findById(task._id));
    res.status(200).json({ success: true, task: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle subtask complete
// @route   PATCH /api/tasks/:id/subtasks/:subtaskId
// @access  Private
const toggleSubtask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) { res.status(404); return next(new Error('Task not found')); }

    const sub = task.subtasks.id(req.params.subtaskId);
    if (!sub) { res.status(404); return next(new Error('Subtask not found')); }

    sub.completed = !sub.completed;
    await task.save();

    const populated = await populateTask(Task.findById(task._id));
    res.status(200).json({ success: true, task: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete subtask
// @route   DELETE /api/tasks/:id/subtasks/:subtaskId
// @access  Admin, HR
const deleteSubtask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) { res.status(404); return next(new Error('Task not found')); }

    task.subtasks = task.subtasks.filter(s => s._id.toString() !== req.params.subtaskId);
    await task.save();

    const populated = await populateTask(Task.findById(task._id));
    res.status(200).json({ success: true, task: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Log time
// @route   PATCH /api/tasks/:id/time
// @access  Private
const logTime = async (req, res, next) => {
  try {
    const { minutes } = req.body;
    if (!minutes || minutes < 0) { res.status(400); return next(new Error('Invalid minutes')); }

    const task = await Task.findById(req.params.id);
    if (!task) { res.status(404); return next(new Error('Task not found')); }

    const isAdminOrHr = req.user.role === 'admin' || req.user.role === 'hr';
    const isAssigned = task.assignedTo.map(id => id.toString()).includes(req.user._id.toString());
    if (!isAdminOrHr && !isAssigned) {
      res.status(403); return next(new Error('Not assigned to this task'));
    }

    await task.updateOne({ $inc: { timeSpent: minutes } });

    // Save to timesheet — use IST (UTC+5:30) date so late-night logs land on correct day
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const today = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));
    await TimeEntry.create({
      user: req.user._id,
      task: task._id,
      date: today,
      minutes,
    });

    const populated = await populateTask(Task.findById(task._id));
    res.status(200).json({ success: true, task: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment
// @route   POST /api/tasks/:id/comments
// @access  Private
const addComment = async (req, res, next) => {
  try {
    if (!req.body.text?.trim()) { res.status(400); return next(new Error('Comment text is required')); }
    const task = await Task.findById(req.params.id);
    if (!task) { res.status(404); return next(new Error('Task not found')); }

    task.comments.push({ user: req.user._id, text: req.body.text.trim(), createdAt: new Date() });
    await task.save();

    // Parse @mentions — find @Name patterns, match against users
    const mentionPattern = /@([A-Za-z]+(?: [A-Za-z]+)?)/g;
    const mentionedNames = [];
    let m;
    while ((m = mentionPattern.exec(req.body.text || '')) !== null) {
      mentionedNames.push(m[1].toLowerCase());
    }
    if (mentionedNames.length) {
      const allUsers = await User.find({ isActive: true }).select('_id name');
      const mentionedUsers = allUsers.filter(u => mentionedNames.some(n => u.name.toLowerCase().includes(n)));
      await Promise.all(mentionedUsers.map(u =>
        createNotification(u._id, 'You were mentioned', `${req.user.name} mentioned you in: ${task.title}`, 'task', `/tasks`)
      ));
    }

    const notifyUsers = [...new Set(
      [...(task.assignedTo || []), task.assignedBy, ...(task.watchers || [])]
        .filter(Boolean)
        .map(id => id.toString())
        .filter(id => id !== req.user._id.toString())
    )];

    await Promise.all(notifyUsers.map(userId =>
      createNotification(userId, 'New Comment on Task', `${req.user.name} commented on: ${task.title}`, 'task', `/tasks`)
    ));

    const populated = await populateTask(Task.findById(task._id));
    res.status(200).json({ success: true, task: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Admin, HR
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) { res.status(404); return next(new Error('Task not found')); }

    await task.deleteOne();
    await logActivity(req.user._id, 'delete', 'Task', task._id, `Deleted task: ${task.title}`, req.ip);

    res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload attachment to task
// @route   POST /api/tasks/:id/attachments
// @access  Private
const addAttachment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) { res.status(404); return next(new Error('Task not found')); }
    if (!req.file) { res.status(400); return next(new Error('No file uploaded')); }

    task.attachments.push({
      name: path.basename(req.file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '_'),
      url: `/uploads/${req.file.filename}`,
      size: req.file.size,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    });
    await task.save();

    const populated = await populateTask(Task.findById(task._id));
    res.status(200).json({ success: true, task: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete attachment from task
// @route   DELETE /api/tasks/:id/attachments/:attachmentId
// @access  Admin, HR
const deleteAttachment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) { res.status(404); return next(new Error('Task not found')); }

    task.attachments = task.attachments.filter(a => a._id.toString() !== req.params.attachmentId);
    await task.save();

    const populated = await populateTask(Task.findById(task._id));
    res.status(200).json({ success: true, task: populated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks, getTaskById, createTask, updateTask,
  reorderTasks, toggleWatch,
  addSubtask, toggleSubtask, deleteSubtask,
  logTime, addComment, deleteTask,
  addAttachment, deleteAttachment,
};
