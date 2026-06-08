const User = require('../models/User');

// @desc    Get today's celebrations (birthdays and anniversaries)
// @route   GET /api/celebrations/today
// @access  Private
const getTodayCelebrations = async (req, res, next) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const birthdays = await User.find({
      isActive: true,
      $expr: {
        $and: [
          { $eq: [{ $month: '$dateOfBirth' }, month] },
          { $eq: [{ $dayOfMonth: '$dateOfBirth' }, day] },
        ],
      },
    }).select('name department designation dateOfBirth');

    const anniversaries = await User.find({
      isActive: true,
      $expr: {
        $and: [
          { $eq: [{ $month: '$joiningDate' }, month] },
          { $eq: [{ $dayOfMonth: '$joiningDate' }, day] },
        ],
      },
    }).select('name department designation joiningDate');

    res.status(200).json({
      success: true,
      birthdays,
      anniversaries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get upcoming celebrations (next 30 days)
// @route   GET /api/celebrations/upcoming
// @access  Private
const getUpcomingCelebrations = async (req, res, next) => {
  try {
    const today = new Date();
    const upcoming = [];

    // Build an array of (month, day) pairs for next 30 days
    const datePairs = [];
    for (let i = 0; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      datePairs.push({ month: d.getMonth() + 1, day: d.getDate() });
    }

    const activeUsers = await User.find({ isActive: true })
      .select('name department designation dateOfBirth joiningDate');

    const birthdays = [];
    const anniversaries = [];

    for (const user of activeUsers) {
      if (user.dateOfBirth) {
        const bMonth = user.dateOfBirth.getMonth() + 1;
        const bDay = user.dateOfBirth.getDate();
        const match = datePairs.find((dp) => dp.month === bMonth && dp.day === bDay);
        if (match) {
          birthdays.push({
            _id: user._id,
            name: user.name,
            department: user.department,
            designation: user.designation,
            dateOfBirth: user.dateOfBirth,
            upcomingDate: new Date(today.getFullYear(), bMonth - 1, bDay),
          });
        }
      }

      if (user.joiningDate) {
        const jMonth = user.joiningDate.getMonth() + 1;
        const jDay = user.joiningDate.getDate();
        const match = datePairs.find((dp) => dp.month === jMonth && dp.day === jDay);
        if (match) {
          const yearsCompleted = today.getFullYear() - user.joiningDate.getFullYear();
          if (yearsCompleted > 0) {
            anniversaries.push({
              _id: user._id,
              name: user.name,
              department: user.department,
              designation: user.designation,
              joiningDate: user.joiningDate,
              yearsCompleted,
              upcomingDate: new Date(today.getFullYear(), jMonth - 1, jDay),
            });
          }
        }
      }
    }

    // Sort by upcoming date
    birthdays.sort((a, b) => a.upcomingDate - b.upcomingDate);
    anniversaries.sort((a, b) => a.upcomingDate - b.upcomingDate);

    res.status(200).json({
      success: true,
      birthdays,
      anniversaries,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTodayCelebrations,
  getUpcomingCelebrations,
};
