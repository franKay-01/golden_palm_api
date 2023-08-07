const express = require('express');
const router = express.Router();

router.post('/payment', async (req, res) => {
  const { amount, currency, successUrl, cancelUrl } = req.body;

  try {
    // Create a session using the Stripe API
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: 'Product Name', // Replace with your product name
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Redirect the user to the Stripe checkout page
    res.redirect(303, session.url);
  } catch (error) {
    // Handle payment failure
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
