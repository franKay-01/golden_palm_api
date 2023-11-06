const express = require('express');
const router = express.Router();
const { Users, Orders, Products, Categories, ShippingItemPrice, SubscriptionEmails } = require('../../models');
const authenticateJWT = require('../../middleware/authenticate');


// Error handling middleware
const errorHandler = (err, res) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: { message: err.message } });
};

router.post('/email-subscription', async (req, res) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const email_sub = await SubscriptionEmails.create({email: parsedBody.email})

  if (email_sub){
    res.json({
      response_code: 200,
      response_message:"Email Subscription created successfully"
    })
  }else{
    res.json({
      response_code: 300,
      response_message:"Email Subscription creation failed"
    })
  }
})

router.post('/shipping-rates', authenticateJWT, async (req, res) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const rate_info = await ShippingItemPrice.create({price: parsedBody.price, percentage: parsedBody.percentage})

  if (rate_info){
    res.json({
      response_code: 200,
      response_message:"Shipping rate created successfully"
    })
  }else{
    res.json({
      response_code: 300,
      response_message:"Shipping rate creation failed"
    })
  }
})

router.get('/product-info', async (req, res, next) => {
  try {
    const [allCategories, allProducts] = await Promise.all([
      Categories.findAll({
        order: [['createdAt', 'DESC']]
      }),
      Products.findAll({
        include: ['categories']
      })
    ]);

    res.json({
      response_code: '000',
      allCategories,
      allProducts
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

router.get('/home-analytics', authenticateJWT, async (req, res, next) => {
  try {
    const [userCount, orderCount, productCount, latestUsers, latestOrders] = await Promise.all([
      Users.count(),
      Orders.count(),
      Products.count(),
      Users.findAll({
        limit: 20,
        order: [['createdAt', 'DESC']]
      }),
      Orders.findAll({
        limit: 20,
        order: [['createdAt', 'DESC']]
      })
    ]);

    res.json({
      response_code: '000',
      userCount,
      orderCount,
      productCount,
      latestUsers,
      latestOrders
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

module.exports = router;
