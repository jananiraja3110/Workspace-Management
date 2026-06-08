const express = require('express');
const router = express.Router();
const {
  submitExpense,
  getMyExpenses,
  getPendingExpenses,
  reviewExpense,
  markReimbursed,
  getExpenseReport,
} = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { upload } = require('../middleware/upload');

router.use(protect);

router.post('/', upload.single('receipt'), submitExpense);
router.get('/my', getMyExpenses);
router.get('/pending', authorize('admin', 'hr'), getPendingExpenses);
router.get('/report', authorize('admin'), getExpenseReport);
router.put('/:id/review', authorize('admin', 'hr'), reviewExpense);
router.patch('/:id/reimburse', authorize('admin'), markReimbursed);

module.exports = router;
