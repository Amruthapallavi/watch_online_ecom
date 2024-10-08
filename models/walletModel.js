const mongoose = require('mongoose');


const walletSchema = new mongoose.Schema({
  userId :{
    type : mongoose.Schema.Types.ObjectId,
    required : true,

  },
  balance :{
    type : Number,
    required: true,
    default : 0
  },
  transactionDetails : [{
    orderId:{
      type:String,
    },
    paymentType : {
      type : String,
      // required : true
    },
    date :{
      type : Date,
      
    },
    amount : {
      type : Number,
      // required : true
    }
  }]
 
});

const walletModel = new mongoose.model('wallets',walletSchema);

module.exports = walletModel ;