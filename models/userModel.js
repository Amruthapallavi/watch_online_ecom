const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({

  name : {
    type : String,
    required:true
  },

  email: {
    type : String,
    require : true,
    // unique : true
  },

  phone : {
    type:Number,
    required:true
  },

  password: {
    type:String,
    require:true,
  },


    

  is_admin :{
    type:Boolean,
    default:false
  },
  
  is_active: {
    type:Boolean,
    default:true,
  },
  wishlist_id:{
    type : mongoose.Schema.Types.ObjectId ,
  },
  
  
});

userSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

userSchema.methods.generateResetToken = function() {
  this.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  return this.save();
};


const userModel = new mongoose.model('Users',userSchema); //collection name and schema.

module.exports = userModel;