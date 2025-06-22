const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const mongooseDelete = require('mongoose-delete');

const { Schema } = mongoose;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  hashedPassword: {
    type: String
  },
  role: {
    type: String,
    required: true,
    enum: ['Super Admin', 'Vertical', 'AD', 'VP', 'AVP', 'GM', 'AGM', 'Team Leader', 'Sr. Portfolio Manager',
      'Portfolio Manager','As. Portfolio Manager','Sr. BDE','BDE', 'Employee'],
    default: 'Employee'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "company",
    required: true
  },
  phone: {
    type: String,
    unique: true,
    trim: true
  },
  profilePic: {
    type: String
  },
  assignedTL: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  bookingStatus:{
    type: Boolean,
    default: false
  },



  assignedAD: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedAGM: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedGM: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedAVP: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedVP: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedVertical: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  //////// add new again
 assignedSRPORTFOLIOMANAGER: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedPORTFOLIOMANAGER: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
   assignedASPORTFOLIOMANAGER: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedSRBDE: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
     assignedBDE: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  resetPasswordToken: {
    type: String
  },
  otp: {
    type: String
  },
  otpExpiry: {
    type: Date
  },
  hashSalt: {
    type: String
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isMobileVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  ipaddress: {
    type: String
  },
  fcmMobileToken: {
    type: String
  },
  fcmWebToken: {
    type: String
  },
  bio: {
    type: String
  },
  isPrime: {
    type: Boolean,
    default: false
  }
});

// Add plugins
UserSchema.plugin(timestamps);
UserSchema.plugin(mongooseDelete, {
  deletedBy: true,
  deletedAt: true
});

// Export the model
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
