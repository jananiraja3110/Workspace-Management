const Review = require('../models/Review');
const { createNotification } = require('../utils/createNotification');
const { logActivity } = require('../utils/logActivity');

// @desc    Create review for employee
// @route   POST /api/reviews
// @access  Admin, Manager
const createReview = async (req, res, next) => {
  try {
    req.body.reviewer = req.user._id;

    const review = await Review.create(req.body);

    await createNotification(
      review.employee,
      'New Performance Review',
      `A performance review has been created for period: ${review.period}`,
      'general',
      '/reviews'
    );

    await logActivity(
      req.user._id,
      'create',
      'Review',
      review._id,
      `Created performance review for period: ${review.period}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my reviews
// @route   GET /api/reviews/my
// @access  Private
const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ employee: req.user._id })
      .populate('reviewer', 'name designation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team reviews
// @route   GET /api/reviews/team
// @access  Admin, Manager
const getTeamReviews = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'hr') {
      filter.reviewer = req.user._id;
    }
    // admin sees all

    const reviews = await Review.find(filter)
      .populate('employee', 'name department designation')
      .populate('reviewer', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit review with ratings
// @route   PUT /api/reviews/:id
// @access  Admin, Manager
const submitReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      res.status(404);
      return next(new Error('Review not found'));
    }

    const { ratings, strengths, improvements, goals } = req.body;

    if (ratings) {
      review.ratings = ratings;
      // Calculate overall rating as average of 5 ratings
      const ratingValues = [
        ratings.workQuality,
        ratings.communication,
        ratings.teamwork,
        ratings.punctuality,
        ratings.initiative,
      ].filter((r) => r !== undefined && r !== null);

      if (ratingValues.length > 0) {
        review.overallRating =
          ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length;
      }
    }

    if (strengths !== undefined) review.strengths = strengths;
    if (improvements !== undefined) review.improvements = improvements;
    if (goals !== undefined) review.goals = goals;

    review.status = 'reviewed';
    await review.save();

    await createNotification(
      review.employee,
      'Review Completed',
      `Your performance review for ${review.period} has been completed`,
      'general',
      '/reviews'
    );

    res.status(200).json({
      success: true,
      review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit self assessment
// @route   PUT /api/reviews/:id/self-assessment
// @access  Private (employee)
const submitSelfAssessment = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      res.status(404);
      return next(new Error('Review not found'));
    }

    if (review.employee.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Not authorized to submit self assessment for this review'));
    }

    review.selfAssessment = {
      summary: req.body.summary,
      rating: req.body.rating,
      submittedAt: new Date(),
    };
    review.status = 'self_assessment';
    await review.save();

    res.status(200).json({
      success: true,
      review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Acknowledge review
// @route   PATCH /api/reviews/:id/acknowledge
// @access  Private (employee)
const acknowledgeReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      res.status(404);
      return next(new Error('Review not found'));
    }

    if (review.employee.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Not authorized to acknowledge this review'));
    }

    review.status = 'acknowledged';
    await review.save();

    res.status(200).json({
      success: true,
      review,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getMyReviews,
  getTeamReviews,
  submitReview,
  submitSelfAssessment,
  acknowledgeReview,
};
