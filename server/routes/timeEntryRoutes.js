const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getEntries, getRunning, getTasksForPicker,
  startTimer, stopTimer, setCell, deleteEntry,
} = require('../controllers/timeEntryController');

router.use(protect);

router.get('/running', getRunning);
router.get('/tasks', getTasksForPicker);
router.get('/', getEntries);
router.post('/start', startTimer);
router.post('/stop', stopTimer);
router.put('/cell', setCell);
router.delete('/:id', deleteEntry);

module.exports = router;
