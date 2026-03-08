const mongoose = require('mongoose');

const slideshowSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    default: 'Dola Art Corner'
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Modern async pre-save (no next() needed)
slideshowSchema.pre('save', async function() {
  if (this.isNew) {
    // Count existing documents to set next order
    const count = await this.constructor.countDocuments();
    this.order = count;   // 0, 1, 2, ...
  }
  // No next() — Mongoose waits for promise automatically
});

module.exports = mongoose.model('Slideshow', slideshowSchema);