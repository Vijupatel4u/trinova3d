const User = require('../models/User');
const jwt = require('jsonwebtoken');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'myjwtsecret12345', { expiresIn: '30d' });
};

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.render('auth/register', { error: 'All fields are required', name, email, phone });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.render('auth/register', { error: 'Email already exists.', name, email, phone });

    const user = new User({ name, email, phone, password, addresses: [] });
    await user.save();

    req.session.user = { _id: user._id, name: user.name, email: user.email, role: user.role, addresses: [] };
    req.session.save(() => res.redirect('/'));
  } catch (err) {
    res.render('auth/register', { error: 'Registration failed.', name: req.body.name, email: req.body.email, phone: req.body.phone });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.render('auth/login', { error: 'Invalid email or password' });
    }
    
    req.session.user = { 
      _id: user._id, 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      addresses: user.addresses || [] 
    };
    
    if (!req.session.cart) req.session.cart = [];
    
    req.session.save(() => res.redirect('/'));
  } catch (err) {
    res.render('auth/login', { error: 'Login failed.' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
};

// --- FIX: Address Save with Session Sync ---
exports.saveAddress = async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Please login' });
    
    const { name, phone, address, city, pincode, state } = req.body;
    
    if(!address || !city || !pincode) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const user = await User.findById(req.session.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const newAddress = { name, phone, address, city, pincode, state };
    
    // Address add karna
    user.addresses.push(newAddress);
    await user.save();
    
    // VVIP: Session update karke manual save karna
    req.session.user.addresses = user.addresses;
    req.session.save((err) => {
        if (err) {
            console.error("Session Save Error:", err);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true, address: newAddress });
    });

  } catch (err) { 
    console.error("Save Address Error:", err);
    res.status(500).json({ success: false }); 
  }
};

exports.getAddresses = async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ success: false });
    // Database se fresh addresses nikalna hamesha safe rehta hai
    const user = await User.findById(req.session.user._id).lean();
    res.json({ addresses: user.addresses || [] });
  } catch (err) { res.status(500).json({ success: false }); }
};