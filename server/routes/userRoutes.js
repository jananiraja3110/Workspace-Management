const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateMe,
  deleteUser,
  getTeam,
  updateAvatar,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { upload } = require('../middleware/upload');

router.use(protect);

router.get('/', authorize('admin', 'hr', 'developer'), getUsers);
router.get('/team', authorize('admin', 'hr', 'developer'), getTeam);
router.put('/me', updateMe);
router.get('/:id', authorize('admin', 'hr', 'developer'), getUserById);
router.post('/', authorize('admin'), createUser);
router.put('/:id', authorize('admin'), updateUser);
router.put('/:id/avatar', authorize('admin', 'hr', 'developer'), upload.single('avatar'), updateAvatar);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
