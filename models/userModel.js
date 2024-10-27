const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,  // Fixed typo
    // unique: true  // Uncomment if email should be unique
  },
  phone: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
    required: true,  // Fixed typo
  },
  is_admin: {
    type: Boolean,
    default: false,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  referralCode: {
    type: String,
    unique: true,
  },
  redeemReferralCodeBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',  // Reference to the Users model
  },
  referralCodeRedeemed: {
    type: Boolean,
    default: false,
  }
});

// Corrected model creation without `new`
const userModel = mongoose.model('Users', userSchema); // collection name and schema.

module.exports = userModel;
