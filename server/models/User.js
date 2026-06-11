const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true },
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
    role: { type: String, enum: ['admin', 'hr', 'developer'], default: 'developer' },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    phone: { type: String, trim: true },
    dateOfBirth: { type: Date },
    joiningDate: { type: Date },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    leaveBalance: {
      casual: { type: Number, default: 12 },
      sick: { type: Number, default: 6 },
      earned: { type: Number, default: 15 },
    },
    mustChangePassword: { type: Boolean, default: true },
    onboardingCompleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    avatar: { type: String, default: '' },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    otpCode:   { type: String },
    otpExpire: { type: Date },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ role: 1 });
userSchema.index({ managerId: 1 });

module.exports = mongoose.model('User', userSchema);
