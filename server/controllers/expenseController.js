const Expense = require('../models/Expense');
const { createNotification } = require('../utils/createNotification');
const { logActivity } = require('../utils/logActivity');

// @desc    Submit expense claim
// @route   POST /api/expenses
// @access  Private
const submitExpense = async (req, res, next) => {
  try {
    const expenseData = {
      ...req.body,
      user: req.user._id,
    };

    if (req.file) {
      expenseData.receiptPath = req.file.path;
    }

    const expense = await Expense.create(expenseData);

    await logActivity(
      req.user._id,
      'create',
      'Expense',
      expense._id,
      `Submitted expense claim: ${expense.title}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my expenses
// @route   GET /api/expenses/my
// @access  Private
const getMyExpenses = async (req, res, next) => {
  try {
    const expenses = await Expense.find({ user: req.user._id })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending expense claims
// @route   GET /api/expenses/pending
// @access  Admin, Manager
const getPendingExpenses = async (req, res, next) => {
  try {
    const expenses = await Expense.find({ status: 'pending' })
      .populate('user', 'name department')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Review expense (approve/reject)
// @route   PUT /api/expenses/:id/review
// @access  Admin, Manager
const reviewExpense = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400);
      return next(new Error('Status must be approved or rejected'));
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewNote,
        reviewedBy: req.user._id,
      },
      { new: true, runValidators: true }
    );

    if (!expense) {
      res.status(404);
      return next(new Error('Expense not found'));
    }

    await createNotification(
      expense.user,
      `Expense ${status}`,
      `Your expense claim "${expense.title}" has been ${status}`,
      'expense',
      '/expenses'
    );

    await logActivity(
      req.user._id,
      'review',
      'Expense',
      expense._id,
      `${status} expense claim: ${expense.title}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark expense as reimbursed
// @route   PATCH /api/expenses/:id/reimburse
// @access  Admin
const markReimbursed = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        status: 'reimbursed',
        reimbursedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!expense) {
      res.status(404);
      return next(new Error('Expense not found'));
    }

    await createNotification(
      expense.user,
      'Expense Reimbursed',
      `Your expense claim "${expense.title}" has been reimbursed`,
      'expense',
      '/expenses'
    );

    await logActivity(
      req.user._id,
      'reimburse',
      'Expense',
      expense._id,
      `Reimbursed expense: ${expense.title}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expense report (aggregation)
// @route   GET /api/expenses/report
// @access  Admin
const getExpenseReport = async (req, res, next) => {
  try {
    const totalByCategory = await Expense.aggregate([
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const totalByStatus = await Expense.aggregate([
      { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const totalByMonth = await Expense.aggregate([
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
    ]);

    res.status(200).json({
      success: true,
      report: {
        totalByCategory,
        totalByStatus,
        totalByMonth,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitExpense,
  getMyExpenses,
  getPendingExpenses,
  reviewExpense,
  markReimbursed,
  getExpenseReport,
};
