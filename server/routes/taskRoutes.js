const express = require('express');
const router = express.Router();
const {
  getTasks, getTaskById, createTask, updateTask,
  reorderTasks, toggleWatch,
  addSubtask, toggleSubtask, deleteSubtask,
  logTime, addComment, deleteTask,
  addAttachment, deleteAttachment,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { upload } = require('../middleware/upload');

router.use(protect);

router.get('/', getTasks);
router.post('/', authorize('admin', 'hr'), createTask);
router.patch('/reorder', reorderTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', authorize('admin', 'hr'), deleteTask);

router.patch('/:id/watch', toggleWatch);
router.patch('/:id/time', logTime);

router.post('/:id/subtasks', authorize('admin', 'hr'), addSubtask);
router.patch('/:id/subtasks/:subtaskId', toggleSubtask);
router.delete('/:id/subtasks/:subtaskId', authorize('admin', 'hr'), deleteSubtask);

router.post('/:id/comments', addComment);

router.post('/:id/attachments', upload.single('file'), addAttachment);
router.delete('/:id/attachments/:attachmentId', authorize('admin', 'hr'), deleteAttachment);

module.exports = router;
