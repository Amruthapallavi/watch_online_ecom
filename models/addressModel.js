const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  
userId : {
  type : mongoose.Schema.Types.ObjectId ,
  ref:"userModel",
  required : true
},

house_no:{
   type:String,
   required:true
},

state : {
  type : String,
  required : true,
},
district : {
  type : String,
  required : true,
},
city : {
  type : String,
  required : true,
},
locality : {
  type : String,
  
},
street :{
    type:String,

},
pincode : {
  type : Number,
  required : true,
},

 phone : {
  type : Number,
  required : true,
},
name: {
  type : String,
  required:true,
}


});




const addressModel = new mongoose.model('address',addressSchema);


module.exports = addressModel;