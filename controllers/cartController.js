const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

// 1. Get Cart Page
exports.getCart = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const cart = await Cart.findOne({ user: req.session.user._id }).populate('items.product');
    const cartItems = cart ? cart.items : [];
    const totalAmount = cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    
    // Global count update for header
    req.session.cartCount = cartItems.length;

    res.render('cart', { 
      user: req.session.user, 
      cartItems, 
      totalAmount,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error('Get Cart Error:', err);
    res.render('cart', { user: req.session.user, cartItems: [], totalAmount: 0, error: 'Error loading cart', success: null });
  }
};

// 2. Update Quantity
exports.updateQuantity = async (req, res) => {
  if (!req.session.user) return res.json({ success: false });
  try {
    const { productId, action } = req.body;
    const cart = await Cart.findOne({ user: req.session.user._id });
    
    if (cart) {
      const itemIndex = cart.items.findIndex(p => p.product.toString() === productId);
      if (itemIndex > -1) {
        if (action === 'increase') {
          cart.items[itemIndex].quantity += 1;
        } else if (action === 'decrease' && cart.items[itemIndex].quantity > 1) {
          cart.items[itemIndex].quantity -= 1;
        }
        await cart.save();
        return res.json({ success: true });
      }
    }
    res.json({ success: false, message: 'Item not found in cart' });
  } catch (err) {
    console.error('Update Quantity Error:', err);
    res.status(500).json({ success: false });
  }
};

// 3. Get Checkout Page - (Variable Name mismatch Fix)
exports.getCheckout = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const cartDoc = await Cart.findOne({ user: req.session.user._id }).populate('items.product');
    
    // EJS expects 'cart' variable as an array based on your checkout.ejs logic
    const cartItems = cartDoc ? cartDoc.items.map(item => ({
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
    })) : [];

    const user = await User.findById(req.session.user._id).lean();

    res.render('checkout', {
      user: user,
      cart: cartItems, // Isse error 'cart is not defined' solve ho jayega
      error: null
    });
  } catch (err) {
    console.error('Checkout Page Error:', err);
    res.redirect('/cart');
  }
};

// 4. Add to Cart
exports.addToCart = async (req, res) => {
  if (!req.session.user) return res.json({ success: false, message: 'Please login first' });
  try {
    const productId = req.params.id;
    let cart = await Cart.findOne({ user: req.session.user._id });
    
    if (!cart) {
      cart = new Cart({ user: req.session.user._id, items: [] });
    }

    const itemIndex = cart.items.findIndex(i => i.product.toString() === productId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += 1;
    } else {
      cart.items.push({ product: productId, quantity: 1 });
    }
    
    await cart.save();
    
    // Update count in session
    req.session.cartCount = cart.items.length;

    res.json({ success: true, message: 'Product added to cart', cartCount: cart.items.length });
  } catch (err) {
    console.error('Add to Cart Error:', err);
    res.json({ success: false, message: 'Error adding to cart' });
  }
};

// 5. Remove Item
exports.removeItem = async (req, res) => {
  if (!req.session.user) return res.json({ success: false });
  try {
    const cart = await Cart.findOne({ user: req.session.user._id });
    if (cart) {
      cart.items = cart.items.filter(i => i.product.toString() !== req.params.id);
      await cart.save();
      req.session.cartCount = cart.items.length;
    }
    res.json({ success: true, cartCount: req.session.cartCount });
  } catch (err) {
    console.error('Remove Item Error:', err);
    res.json({ success: false });
  }
};

// 6. Clear Cart
exports.clearCart = async (req, res) => {
  if (!req.session.user) return res.json({ success: false });
  try {
    await Cart.findOneAndDelete({ user: req.session.user._id });
    req.session.cartCount = 0;
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    console.error('Clear Cart Error:', err);
    res.json({ success: false });
  }
};