const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getMyAttendance,
  getTodayAttendance,
  getTeamAttendance,
  getAttendanceReport,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/my', getMyAttendance);
router.get('/today', getTodayAttendance);
router.get('/team', authorize('admin', 'hr'), getTeamAttendance);
router.get('/report', authorize('admin'), getAttendanceReport);

module.exports = router;
