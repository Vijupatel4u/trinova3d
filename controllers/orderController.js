const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');

exports.placeOrder = async (req, res) => {
  try {
    const { items, totalAmount, shippingAddress, paymentMethod } = req.body;
    const userId = req.session.user._id;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in cart' });
    }

    const newOrder = new Order({
      user: userId,
      items,
      totalAmount,
      shippingAddress,
      paymentMethod,
      status: 'Processing'
    });

    await newOrder.save();

    // Sync address to User profile if not already there
    const user = await User.findById(userId);
    const isDuplicate = user.addresses.some(addr => 
      addr.address === shippingAddress.address && addr.pincode === shippingAddress.pincode
    );

    if (!isDuplicate) {
      user.addresses.push({ ...shippingAddress });
      await user.save();
      // Update session to include the new address [cite: 10]
      req.session.user.addresses = user.addresses;
    }

    // Empty the cart in DB and Session
    await Cart.findOneAndDelete({ user: userId });
    if (req.session.cart) {
        req.session.cart = { items: [], totalQuantity: 0, totalPrice: 0 };
    }

    res.status(201).json({ success: true, message: 'Order placed successfully!' });
  } catch (err) {
    console.error('Order Error:', err);
    res.status(500).json({ success: false, message: 'Failed to place order.' });
  }
};