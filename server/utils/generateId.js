const User = require('../models/User');

const generateEmployeeId = async (role) => {
  const prefix = role === 'admin' ? 'ADW-ADM' : role === 'hr' ? 'ADW-HR' : 'ADW-DEV';

  const lastUser = await User.findOne({ employeeId: new RegExp(`^${prefix}`) })
    .sort({ employeeId: -1 })
    .select('employeeId');

  let nextNum = 1;
  if (lastUser && lastUser.employeeId) {
    const parts = lastUser.employeeId.split('-');
    nextNum = parseInt(parts[parts.length - 1]) + 1;
  }

  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
};

module.exports = { generateEmployeeId };
