const express = require('express');
const router = express.Router();
const {
  assignSchedule,
  bulkAssign,
  getMySchedule,
  getTeamSchedule,
  updateSchedule,
} = require('../controllers/scheduleController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.post('/', authorize('admin', 'hr'), assignSchedule);
router.post('/bulk', authorize('admin', 'hr'), bulkAssign);
router.get('/my', getMySchedule);
router.get('/team', authorize('admin', 'hr'), getTeamSchedule);
router.put('/:id', authorize('admin', 'hr'), updateSchedule);

module.exports = router;
