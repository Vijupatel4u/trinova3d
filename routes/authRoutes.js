const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const bcrypt = require('bcryptjs');

// --- Registration Routes ---
router.get('/register', (req, res) => {
  res.render('auth/register', { 
    error: null, 
    name: '', 
    email: '', 
    phone: '' 
  });
});
router.post('/register', authController.register);

// --- Login Routes ---
router.get('/login', (req, res) => {
  res.render('auth/login', { error: null });
});
router.post('/login', authController.login);

// --- Logout Route ---
router.get('/logout', authController.logout);

// --- Address Management Routes ---
router.post('/save-address', authController.saveAddress);
router.get('/addresses', authController.getAddresses);

module.exports = router;