const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log(`  Email: ${existingAdmin.email}`);
      console.log(`  Employee ID: ${existingAdmin.employeeId}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      employeeId: 'ADW-ADM-001',
      name: 'Mohammed Ali',
      email: 'mohammed.ali@absolutedata.ai',
      password: 'Admin@123',
      role: 'admin',
      mustChangePassword: false,
      department: 'Administration',
      designation: 'System Administrator',
      joiningDate: new Date(),
    });

    console.log('Admin user created successfully:');
    console.log(`  Name: ${admin.name}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Employee ID: ${admin.employeeId}`);
    console.log(`  Role: ${admin.role}`);
    console.log(`  Password: Admin@123`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();
