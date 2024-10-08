const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: Number,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  min_purchase :{
    type: Number,
    required : true
  },
  isDeleted :{
    type : Boolean,
    required : true,
    default : false
  },
  redeemedBy: [{
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'users' 
}],
  
});

const couponModel = new mongoose.model('coupons', couponSchema);

module.exports = couponModel;
