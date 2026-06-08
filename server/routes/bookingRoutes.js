const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getRoomBookings,
  getTodayBookings,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createBooking);
router.get('/my', getMyBookings);
router.get('/today', getTodayBookings);
router.get('/room/:roomId', getRoomBookings);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
