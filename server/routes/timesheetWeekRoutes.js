const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMyWeek, submitWeek, recallWeek,
  getPending, getAllWeeks, approveWeek, rejectWeek,
} = require('../controllers/timesheetWeekController');

router.use(protect);

router.get('/my',      getMyWeek);
router.post('/submit', submitWeek);
router.post('/recall', recallWeek);
router.get('/pending', getPending);
router.get('/all',     getAllWeeks);
router.post('/:id/approve', approveWeek);
router.post('/:id/reject',  rejectWeek);

module.exports = router;
