const express = require('express');
const router = express.Router();
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.get('/', getEvents);
router.post('/', authorize('admin', 'hr'), createEvent);
router.put('/:id', authorize('admin', 'hr'), updateEvent);
router.delete('/:id', authorize('admin'), deleteEvent);

module.exports = router;
