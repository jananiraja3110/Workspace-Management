const express = require('express');
const router = express.Router();
const {
  createReview,
  getMyReviews,
  getTeamReviews,
  submitReview,
  submitSelfAssessment,
  acknowledgeReview,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.post('/', authorize('admin', 'hr'), createReview);
router.get('/my', getMyReviews);
router.get('/team', authorize('admin', 'hr'), getTeamReviews);
router.put('/:id', authorize('admin', 'hr'), submitReview);
router.put('/:id/self-assessment', submitSelfAssessment);
router.patch('/:id/acknowledge', acknowledgeReview);

module.exports = router;
