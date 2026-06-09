const Space = require('../models/Space');
const Task  = require('../models/Task');

// GET /api/spaces — all spaces (everyone can see)
const getSpaces = async (req, res, next) => {
  try {
    const spaces = await Space.find()
      .sort({ position: 1, createdAt: 1 })
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name');
    res.json({ success: true, spaces });
  } catch (err) { next(err); }
};

// POST /api/spaces — admin/hr only
const createSpace = async (req, res, next) => {
  try {
    const { name, color, icon, description, members } = req.body;
    if (!name?.trim()) {
      res.status(400);
      return next(new Error('Space name is required'));
    }
    const count = await Space.countDocuments();
    const space = await Space.create({
      name: name.trim(),
      color: color || '#6366F1',
      icon:  icon  || '',
      description: description || '',
      members: members || [],
      createdBy: req.user._id,
      position: (count + 1) * 1000,
    });
    await space.populate('members', 'name email');
    await space.populate('createdBy', 'name');
    res.status(201).json({ success: true, space });
  } catch (err) { next(err); }
};

// PUT /api/spaces/:id — admin/hr only
const updateSpace = async (req, res, next) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space) { res.status(404); return next(new Error('Space not found')); }
    const { name, color, icon, description, members } = req.body;
    if (name !== undefined) space.name = name.trim();
    if (color !== undefined) space.color = color;
    if (icon !== undefined) space.icon = icon;
    if (description !== undefined) space.description = description;
    if (members !== undefined) space.members = members;
    await space.save();
    await space.populate('members', 'name email');
    res.json({ success: true, space });
  } catch (err) { next(err); }
};

// DELETE /api/spaces/:id — admin only; unlinks tasks but doesn't delete them
const deleteSpace = async (req, res, next) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space) { res.status(404); return next(new Error('Space not found')); }
    // Unlink tasks from this space
    await Task.updateMany({ space: space._id }, { $unset: { space: '' } });
    await space.deleteOne();
    res.json({ success: true, message: 'Space deleted' });
  } catch (err) { next(err); }
};

// GET /api/spaces/:id/tasks — tasks belonging to a space
const getSpaceTasks = async (req, res, next) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space) { res.status(404); return next(new Error('Space not found')); }
    const tasks = await Task.find({ space: space._id })
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name')
      .sort({ order: 1, createdAt: -1 });
    res.json({ success: true, tasks });
  } catch (err) { next(err); }
};

module.exports = { getSpaces, createSpace, updateSpace, deleteSpace, getSpaceTasks };
