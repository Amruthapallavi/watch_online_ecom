const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
 
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  

  deliveryAddress: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  orderStatus: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
  },
  productsDetails :[{
    productId :{
      type :  mongoose.Schema.Types.ObjectId,
      required : true
    },


    quantity : {
      type : Number,
      required : true
    },
    
  }],

  paymentDetails :{
    method : {
      type : String,
      required : true
    },
    paymentId : {
      type : String
    },
    orderId : {
      type : String
    }
  },

   grandTotal : {
      type : Number,
      required : true
    },
    isCanceled :{
      type : Boolean,
      default : false
    },
    cancellationReason: {
      type: String,
      
       
    },
    cancelRequested : {
      type : Boolean,
      default : false
    },
  
    cancelRequestDeclined :{
      type : Boolean,
      default :false
  
    },
  
   declineRequestReason :{
    type : String,
    default : null
   },
    walletMoney :{
      type : Number,
      required : true,
      default : 0
    },
    couponDiscount :{
      type : Number,
    },
    couponCode:{
     type:Number,
    },
    offerDiscount:{
   type:Number,
   default:0,
    },
    placedAt: { type: Date, default: Date.now }

});

  


const orderModel = new mongoose.model('orders',orderSchema);

module.exports = orderModel;