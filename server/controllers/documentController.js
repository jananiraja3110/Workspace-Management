const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const { logActivity } = require('../utils/logActivity');

// @desc    Get company documents filtered by visibleTo
// @route   GET /api/documents/company
// @access  Private
const getCompanyDocs = async (req, res, next) => {
  try {
    const { role } = req.user;
    const filter = { type: 'company' };

    if (role === 'developer') {
      filter.visibleTo = { $in: ['all', 'developer'] };
    } else if (role === 'hr') {
      filter.visibleTo = { $in: ['all', 'hr', 'admin'] };
    }
    // admin sees all company docs

    const documents = await Document.find(filter)
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my personal documents
// @route   GET /api/documents/my
// @access  Private
const getMyDocs = async (req, res, next) => {
  try {
    const documents = await Document.find({
      type: 'personal',
      user: req.user._id,
    })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload document
// @route   POST /api/documents/upload
// @access  Private
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      return next(new Error('Please upload a file'));
    }

    const document = await Document.create({
      title: req.body.title || req.file.originalname,
      description: req.body.description,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      folder: req.body.folder || 'general',
      type: req.body.type || 'personal',
      uploadedBy: req.user._id,
      user: req.body.user || req.user._id,
      visibleTo: req.body.visibleTo || 'all',
    });

    await logActivity(
      req.user._id,
      'upload',
      'Document',
      document._id,
      `Uploaded document: ${document.title}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      document,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download document
// @route   GET /api/documents/:id/download
// @access  Private
const downloadDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      res.status(404);
      return next(new Error('Document not found'));
    }

    // Verify access
    const { role, _id } = req.user;
    if (document.type === 'personal' && document.user.toString() !== _id.toString() && role !== 'admin') {
      res.status(403);
      return next(new Error('Not authorized to access this document'));
    }

    const filePath = path.resolve(document.filePath);

    if (!fs.existsSync(filePath)) {
      res.status(404);
      return next(new Error('File not found on server'));
    }

    res.download(filePath, document.fileName);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private (owner or admin)
const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      res.status(404);
      return next(new Error('Document not found'));
    }

    // Owner or admin only
    if (document.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('Not authorized to delete this document'));
    }

    // Delete file from disk
    const filePath = path.resolve(document.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await document.deleteOne();

    await logActivity(
      req.user._id,
      'delete',
      'Document',
      document._id,
      `Deleted document: ${document.title}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanyDocs,
  getMyDocs,
  uploadDocument,
  downloadDocument,
  deleteDocument,
};
