const express = require('express');
const router = express.Router();
const {
  getMyPayslips,
  getPayslipById,
  downloadPayslip,
  createPayslip,
  bulkCreatePayslips,
  deletePayslip,
} = require('../controllers/payslipController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { upload } = require('../middleware/upload');

router.use(protect);

router.get('/my', getMyPayslips);
router.get('/:id', getPayslipById);
router.get('/:id/download', downloadPayslip);
router.post('/', authorize('admin'), upload.single('pdf'), createPayslip);
router.post('/bulk', authorize('admin'), bulkCreatePayslips);
router.delete('/:id', authorize('admin'), deletePayslip);

module.exports = router;
