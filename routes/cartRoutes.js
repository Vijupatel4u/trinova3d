const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// 1. Cart Page Load karne ke liye (GET)
router.get('/', cartController.getCart);

// 2. Product ko Cart mein add karne ke liye (POST) → Ab JSON response bhejega
router.post('/add/:id', cartController.addToCart);

// 3. Cart se item hatane ke liye (POST)
router.post('/remove/:id', cartController.removeItem);

// 4. Quantity update karne ke liye (Plus/Minus buttons)
router.post('/update-quantity', cartController.updateQuantity);

// 5. Checkout page load karne ke liye (GET)
router.get('/checkout', cartController.getCheckout);

// 6. Cart poora khali karne ke liye (Order ke baad)
router.post('/clear', cartController.clearCart);

module.exports = router;