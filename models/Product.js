const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  // Yeh change karo:
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category'   // ← Yeh important line
  },
  images: [String],
  // baaki fields...
});

module.exports = mongoose.model('Product', productSchema);