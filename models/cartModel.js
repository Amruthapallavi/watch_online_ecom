const mongoose = require('mongoose');

const cartSchema= new mongoose.Schema({
  userId:{
    type: mongoose.Schema.Types.ObjectId,
    required:true,
  },
  products:[{
    productId:{
      type:mongoose.Schema.Types.ObjectId,
      required:true,
    },
    quantity:{
      type:Number,
      required:true,
    },
    
  }]
})

const cartModel = new mongoose.model('carts',cartSchema);

module.exports = cartModel;
