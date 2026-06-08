const Settings = require('../models/Settings');

// @desc    Get all settings as key-value object
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res, next) => {
  try {
    const settingsDocs = await Settings.find();

    const settings = {};
    settingsDocs.forEach((doc) => {
      settings[doc.key] = doc.value;
    });

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a single setting (upsert)
// @route   PUT /api/settings/:key
// @access  Admin
const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const setting = await Settings.findOneAndUpdate(
      { key },
      { key, value, updatedBy: req.user._id },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      setting,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update multiple settings at once (upsert)
// @route   PUT /api/settings
// @access  Admin
const updateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      res.status(400);
      return next(new Error('Please provide settings as an object of key-value pairs'));
    }

    const operations = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { key, value, updatedBy: req.user._id },
        upsert: true,
      },
    }));

    await Settings.bulkWrite(operations);

    // Return updated settings
    const settingsDocs = await Settings.find();
    const result = {};
    settingsDocs.forEach((doc) => {
      result[doc.key] = doc.value;
    });

    res.status(200).json({
      success: true,
      settings: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSetting,
  updateSettings,
};
