const express = require('express');
const router = express.Router();
const {
  attendanceReport,
  leaveReport,
  taskReport,
  expenseReport,
  projectReport,
  employeeReport,
  exportCSV,
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);
router.use(authorize('admin'));

router.get('/attendance', attendanceReport);
router.get('/leave', leaveReport);
router.get('/tasks', taskReport);
router.get('/expenses', expenseReport);
router.get('/projects', projectReport);
router.get('/employees', employeeReport);
router.get('/export/:type', exportCSV);

module.exports = router;
