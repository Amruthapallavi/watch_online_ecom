const mongoose = require('mongoose');


const adminSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
      },
    email:{
  type :String,
  required :true,
  unique: true,
  lowercase : true
  },

  password:{
  type:String,
  required:true
 }



});

const adminModel = new mongoose.model('admins',adminSchema);

module.exports = adminModel;