const express = require('express');
const router = express.Router();
const {
  getLogs,
  getUserLogs,
} = require('../controllers/activityLogController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getLogs);
router.get('/user/:id', getUserLogs);

module.exports = router;
