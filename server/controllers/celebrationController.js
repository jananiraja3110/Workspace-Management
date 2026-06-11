const User = require('../models/User');

// @desc    Get today's celebrations (birthdays and anniversaries)
// @route   GET /api/celebrations/today
// @access  Private
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

const getTodayCelebrations = async (req, res, next) => {
  try {
    const ist = new Date(Date.now() + IST_OFFSET);
    const month = ist.getUTCMonth() + 1;
    const day = ist.getUTCDate();

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
    const istNow = new Date(Date.now() + IST_OFFSET);
    const todayUTC = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));
    const today = istNow; // IST "today" for year/month/day extraction

    // Build an array of (month, day) pairs for next 30 days (IST)
    const datePairs = [];
    for (let i = 0; i <= 30; i++) {
      const d = new Date(todayUTC.getTime() + i * 86400000);
      datePairs.push({ month: d.getUTCMonth() + 1, day: d.getUTCDate() });
    }

    const activeUsers = await User.find({ isActive: true })
      .select('name department designation dateOfBirth joiningDate');

    const birthdays = [];
    const anniversaries = [];

    for (const user of activeUsers) {
      if (user.dateOfBirth) {
        const bMonth = user.dateOfBirth.getUTCMonth() + 1;
        const bDay   = user.dateOfBirth.getUTCDate();
        const match  = datePairs.find((dp) => dp.month === bMonth && dp.day === bDay);
        if (match) {
          birthdays.push({
            _id: user._id,
            name: user.name,
            department: user.department,
            designation: user.designation,
            dateOfBirth: user.dateOfBirth,
            upcomingDate: new Date(Date.UTC(today.getUTCFullYear(), bMonth - 1, bDay)),
          });
        }
      }

      if (user.joiningDate) {
        const jMonth = user.joiningDate.getUTCMonth() + 1;
        const jDay   = user.joiningDate.getUTCDate();
        const match  = datePairs.find((dp) => dp.month === jMonth && dp.day === jDay);
        if (match) {
          const yearsCompleted = today.getUTCFullYear() - user.joiningDate.getUTCFullYear();
          if (yearsCompleted > 0) {
            anniversaries.push({
              _id: user._id,
              name: user.name,
              department: user.department,
              designation: user.designation,
              joiningDate: user.joiningDate,
              yearsCompleted,
              upcomingDate: new Date(Date.UTC(today.getUTCFullYear(), jMonth - 1, jDay)),
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
