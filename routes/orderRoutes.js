const express = require('express');
const router = express.Router();

/* ================= CHECKOUT ================= */
router.get('/checkout', (req, res) => {
  if (!req.session.cart || req.session.cart.length === 0) {
    return res.redirect('/cart');
  }

  const totalAmount = req.session.cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  res.render('checkout', {
    cartItems: req.session.cart,
    totalAmount,
    user: req.session.user || null
  });
});

/* ================= ORDER SUCCESS ================= */
router.get('/order-success', (req, res) => {
  req.session.cart = [];
  res.render('order-success', {
    user: req.session.user || null
  });
});

module.exports = router;
