const Task = require('../models/Task');
const User = require('../models/User');
const { createNotification } = require('../utils/createNotification');
const { logActivity } = require('../utils/logActivity');
const { sendEmail } = require('../utils/sendEmail');
const { taskAssignedEmail } = require('../utils/emailTemplates');

const populateTask = (query) =>
  query
    .populate('assignedTo', 'name')
    .populate('assignedBy', 'name')
    .populate('project', 'name')
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

    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.project) filter.project = req.query.project;

    const tasks = await populateTask(Task.find(filter)).sort({ status: 1, order: 1, createdAt: -1 });

    res.status(200).json({ success: true, count: tasks.length, tasks });
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
      for (const uid of task.assignedTo) {
        await createNotification(uid, 'New Task Assigned', `You have been assigned: ${task.title}`, 'task', `/tasks`);
        const assignee = await User.findById(uid);
        if (assignee) {
          sendEmail(assignee.email, 'New Task Assigned - AD Workspace', taskAssignedEmail(assignee.name, task.title, req.user.name))
            .catch((err) => console.error('Task email failed:', err.message));
        }
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
    if (!req.body.assignedTo) {
      // leave unchanged
    } else if (!Array.isArray(req.body.assignedTo)) {
      req.body.assignedTo = [req.body.assignedTo];
    }
    if (Array.isArray(req.body.assignedTo)) {
      req.body.assignedTo = req.body.assignedTo.filter(id => id && id !== '');
    }

    const task = await populateTask(
      Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
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

    task.subtasks.push({ title: req.body.title, assignedTo: req.body.assignedTo || null });
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

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $inc: { timeSpent: minutes } },
      { new: true }
    );
    if (!task) { res.status(404); return next(new Error('Task not found')); }

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
    const task = await Task.findById(req.params.id);
    if (!task) { res.status(404); return next(new Error('Task not found')); }

    task.comments.push({ user: req.user._id, text: req.body.text, createdAt: new Date() });
    await task.save();

    const notifyUsers = [...new Set(
      [...(task.assignedTo || []), task.assignedBy, ...(task.watchers || [])]
        .filter(Boolean)
        .map(id => id.toString())
        .filter(id => id !== req.user._id.toString())
    )];

    for (const userId of notifyUsers) {
      await createNotification(userId, 'New Comment on Task', `${req.user.name} commented on: ${task.title}`, 'task', `/tasks`);
    }

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
      name: req.file.originalname,
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
