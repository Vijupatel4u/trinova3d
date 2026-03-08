const express = require('express');
const router = express.Router();

// Show Contact Us page
router.get('/', (req, res) => {
  res.render('contact', {
    success: req.query.success || null,
    error: req.query.error || null
  });
});

// Handle form submit → redirect to WhatsApp
router.post('/send', (req, res) => {
  const { name, email, subject, message } = req.body;

  // Basic validation
  if (!name || !message) {
    return res.redirect('/contact?error=Name and Message are required');
  }

  // Prepare WhatsApp message
  const whatsappMessage = encodeURIComponent(
    `*New Enquiry from Dola Art Corner Website*\n\n` +
    `Name: ${name}\n` +
    `Email: ${email || 'Not provided'}\n` +
    `Subject: ${subject || 'General Enquiry'}\n` +
    `Message:\n${message}\n\n` +
    `Reply to this message to contact the customer.`
  );

  // WhatsApp number (same as used in place order)
  const whatsappNumber = '916351901228'; // Change only if needed

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  // Redirect user to WhatsApp
  res.redirect(whatsappUrl);
});

module.exports = router;