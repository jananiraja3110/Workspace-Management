const Credential = require('../models/Credential');
const { encrypt, decrypt } = require('../utils/encryption');
const { logActivity } = require('../utils/logActivity');

// @desc    Get all my credentials (without decrypting passwords)
// @route   GET /api/credentials
// @access  Private
const getCredentials = async (req, res, next) => {
  try {
    const credentials = await Credential.find({ user: req.user._id })
      .select('-password -notes')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: credentials.length,
      credentials,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single credential by ID (owner only, decrypt password and notes)
// @route   GET /api/credentials/:id
// @access  Private
const getCredentialById = async (req, res, next) => {
  try {
    const credential = await Credential.findById(req.params.id);

    if (!credential) {
      res.status(404);
      return next(new Error('Credential not found'));
    }

    // Owner check
    if (credential.user.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Not authorized to access this credential'));
    }

    // Decrypt password and notes
    const credObj = credential.toObject();
    credObj.password = decrypt(credObj.password);
    credObj.notes = decrypt(credObj.notes);

    res.status(200).json({
      success: true,
      credential: credObj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create credential
// @route   POST /api/credentials
// @access  Private
const createCredential = async (req, res, next) => {
  try {
    const { title, url, username, password, notes, category } = req.body;

    const credential = await Credential.create({
      user: req.user._id,
      title,
      url,
      username,
      password: encrypt(password),
      notes: encrypt(notes),
      category,
    });

    await logActivity(
      req.user._id,
      'create',
      'Credential',
      credential._id,
      `Created credential: ${title}`,
      req.ip
    );

    // Return without exposing encrypted values
    const credObj = credential.toObject();
    delete credObj.password;
    delete credObj.notes;

    res.status(201).json({
      success: true,
      credential: credObj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update credential (owner only)
// @route   PUT /api/credentials/:id
// @access  Private
const updateCredential = async (req, res, next) => {
  try {
    const credential = await Credential.findById(req.params.id);

    if (!credential) {
      res.status(404);
      return next(new Error('Credential not found'));
    }

    // Owner check
    if (credential.user.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Not authorized to update this credential'));
    }

    const { title, url, username, password, notes, category } = req.body;

    if (title !== undefined) credential.title = title;
    if (url !== undefined) credential.url = url;
    if (username !== undefined) credential.username = username;
    if (category !== undefined) credential.category = category;

    // Encrypt password and notes if they are being updated
    if (password !== undefined) {
      credential.password = encrypt(password);
    }
    if (notes !== undefined) {
      credential.notes = encrypt(notes);
    }

    await credential.save();

    await logActivity(
      req.user._id,
      'update',
      'Credential',
      credential._id,
      `Updated credential: ${credential.title}`,
      req.ip
    );

    // Return without exposing encrypted values
    const credObj = credential.toObject();
    delete credObj.password;
    delete credObj.notes;

    res.status(200).json({
      success: true,
      credential: credObj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete credential (owner only)
// @route   DELETE /api/credentials/:id
// @access  Private
const deleteCredential = async (req, res, next) => {
  try {
    const credential = await Credential.findById(req.params.id);

    if (!credential) {
      res.status(404);
      return next(new Error('Credential not found'));
    }

    // Owner check
    if (credential.user.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Not authorized to delete this credential'));
    }

    await credential.deleteOne();

    await logActivity(
      req.user._id,
      'delete',
      'Credential',
      credential._id,
      `Deleted credential: ${credential.title}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Credential deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCredentials,
  getCredentialById,
  createCredential,
  updateCredential,
  deleteCredential,
};
