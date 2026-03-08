const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'] },
  phone: { type: String, required: [true, 'Phone is required'] },
  address: { type: String, required: [true, 'Address is required'] },
  city: { type: String, required: [true, 'City is required'] },
  pincode: { type: String, required: [true, 'Pincode is required'] },
  state: { type: String, required: [true, 'State is required'] },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// REMOVED 'next' from async hook
addressSchema.pre('save', async function() {
  if (this.isDefault && this.parent().addresses) {
    this.parent().addresses.forEach(addr => {
      if (addr._id.toString() !== this._id.toString()) {
        addr.isDefault = false;
      }
    });
  }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'] },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true, 
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phone: { 
    type: String, 
    required: [true, 'Phone is required'],
    trim: true
  },
  password: { type: String, required: [true, 'Password is required'] },
  role: { type: String, default: 'customer', enum: ['customer', 'admin'] },
  addresses: [addressSchema],
  defaultAddress: { type: mongoose.Schema.Types.ObjectId, refPath: 'addresses' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// FIXED: Removed 'next' callback from async password hashing
userSchema.pre('save', async function() {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  this.updatedAt = Date.now();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
// Add this to your user controller
exports.saveAddress = async (req, res) => {
  try {
    const { name, phone, address, city, pincode, state } = req.body;
    const userId = req.session.user._id;

    const user = await User.findById(userId);
    
    // Check if address already exists to avoid duplicates
    const isDuplicate = user.addresses.some(addr => 
      addr.address === address && addr.pincode === pincode
    );

    if (!isDuplicate) {
      user.addresses.push({ name, phone, address, city, pincode, state });
      await user.save();
      
      // Update session so the UI reflects the change immediately
      req.session.user.addresses = user.addresses;
      return res.status(200).json({ success: true, message: 'Address saved!' });
    }

    res.status(200).json({ success: true, message: 'Address already exists.' });
  } catch (err) {
    console.error('Save Address Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};