const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSetting,
  updateSettings,
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.get('/', getSettings);
router.put('/', authorize('admin'), updateSettings);
router.put('/:key', authorize('admin'), updateSetting);

module.exports = router;
