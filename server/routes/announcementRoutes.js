const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePin,
  markAsRead,
  reactToAnnouncement,
} = require('../controllers/announcementController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.get('/', getAnnouncements);
router.post('/', authorize('admin', 'hr'), createAnnouncement);
router.put('/:id', authorize('admin', 'hr'), updateAnnouncement);
router.delete('/:id', authorize('admin'), deleteAnnouncement);
router.patch('/:id/pin', authorize('admin', 'hr'), togglePin);
router.patch('/:id/read', markAsRead);
router.patch('/:id/react', reactToAnnouncement);

module.exports = router;
