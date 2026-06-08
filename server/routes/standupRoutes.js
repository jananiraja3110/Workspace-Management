const express = require('express');
const router = express.Router();
const {
  submitStandup,
  getMyStandups,
  getTodayStandup,
  getTeamStandups,
  updateStandup,
} = require('../controllers/standupController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.post('/', submitStandup);
router.get('/my', getMyStandups);
router.get('/today', getTodayStandup);
router.get('/team', authorize('admin', 'hr'), getTeamStandups);
router.put('/:id', updateStandup);

module.exports = router;
