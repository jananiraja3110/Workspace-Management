const Project = require('../models/Project');
const { logActivity } = require('../utils/logActivity');

// @desc    Get projects based on user role
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res, next) => {
  try {
    let filter = {};
    const { role, _id } = req.user;

    if (role === 'admin') {
      // Admin sees all projects
    } else if (role === 'hr') {
      filter = {
        $or: [{ members: _id }, { createdBy: _id }],
      };
    } else {
      // Employee
      filter = { members: _id };
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const projects = await Project.find(filter)
      .populate('members', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members', 'name email role department')
      .populate('createdBy', 'name email');

    if (!project) {
      res.status(404);
      return next(new Error('Project not found'));
    }

    res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Admin, Manager
const createProject = async (req, res, next) => {
  try {
    req.body.createdBy = req.user._id;

    const project = await Project.create(req.body);

    await logActivity(
      req.user._id,
      'create',
      'Project',
      project._id,
      `Created project: ${project.name}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Admin, Manager
const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    if (!project) {
      res.status(404);
      return next(new Error('Project not found'));
    }

    await logActivity(
      req.user._id,
      'update',
      'Project',
      project._id,
      `Updated project: ${project.name}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Admin
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      res.status(404);
      return next(new Error('Project not found'));
    }

    await project.deleteOne();

    await logActivity(
      req.user._id,
      'delete',
      'Project',
      project._id,
      `Deleted project: ${project.name}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
