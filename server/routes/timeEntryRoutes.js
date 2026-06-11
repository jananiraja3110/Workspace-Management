const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const {
  getEntries, getAllEntries, getRunning, getTasksForPicker,
  startTimer, stopTimer, setCell, deleteEntry,
} = require('../controllers/timeEntryController');

router.use(protect);

router.get('/running', getRunning);
router.get('/tasks', getTasksForPicker);
router.get('/all', authorize('admin', 'hr'), getAllEntries);
router.get('/', getEntries);
router.post('/start', startTimer);
router.post('/stop', stopTimer);
router.put('/cell', setCell);
router.delete('/:id', deleteEntry);

module.exports = router;
