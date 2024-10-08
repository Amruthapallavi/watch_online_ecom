const mongoose = require('mongoose');

const { Schema, ObjectId } = mongoose;

const categorySchema = new Schema({
  cname: { 
    type: String, 
    required: true 
  },

  cimage: { 
    type: String, 
    required: true 
  },
  categoryOffer: { type: Number, default: 0 }

});

const categoryModel = new mongoose.model('Category', categorySchema);

module.exports =  categoryModel;