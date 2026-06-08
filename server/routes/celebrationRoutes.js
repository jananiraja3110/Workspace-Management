const express = require('express');
const router = express.Router();
const {
  getTodayCelebrations,
  getUpcomingCelebrations,
} = require('../controllers/celebrationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/today', getTodayCelebrations);
router.get('/upcoming', getUpcomingCelebrations);

module.exports = router;
