const express = require('express');
const router = express.Router();
const {
  getConversations,
  getThread,
  sendMessage,
  markAsRead,
  getUnreadCount,
  reactToMessage,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(protect);

router.get('/conversations', getConversations);
router.get('/with/:userId', getThread);
router.post('/', upload.single('file'), sendMessage);
router.patch('/read/:userId', markAsRead);
router.get('/unread-count', getUnreadCount);
router.post('/:id/react', reactToMessage);

module.exports = router;
