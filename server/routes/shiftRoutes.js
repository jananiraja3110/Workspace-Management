const express = require('express');
const router = express.Router();
const {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
} = require('../controllers/shiftController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.get('/', getShifts);
router.post('/', authorize('admin'), createShift);
router.put('/:id', authorize('admin'), updateShift);
router.delete('/:id', authorize('admin'), deleteShift);

module.exports = router;
