const mongoose = require('mongoose');


const productSchema = new mongoose.Schema({

  pname : {
    type:String,
    required:true
  },
  description : {
    type:String,
    required:true
  },
  category:{
    type : mongoose.Schema.Types.ObjectId,
    required:true
  },
  image : {
    type: Array, 
    required : true ,
    
  },

//   color: { 
//     type: String, 
//     required: true 
//    },

//    sizes: {
//     type: Array, 
//     required: true 
//    },
  
   quantity: { 
    type: Number, 
    required: true 
  },

  price: { 
    type: Number, 
    required: true 
  },
  isDeleted : {
    type : Boolean,
    default : false
  },
  productOffer: { type: Number, default: 0 }

     
  
    
});


const productModel = new mongoose.model('products',productSchema);

module.exports = productModel;
