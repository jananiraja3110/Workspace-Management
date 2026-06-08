const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getMyLeaves,
  getLeaveBalance,
  getPendingLeaves,
  reviewLeave,
} = require('../controllers/leaveController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.post('/', applyLeave);
router.get('/my', getMyLeaves);
router.get('/balance', getLeaveBalance);
router.get('/pending', authorize('admin', 'hr'), getPendingLeaves);
router.put('/:id/review', authorize('admin', 'hr'), reviewLeave);

module.exports = router;
