const express = require('express');
const schedule = require('node-schedule');
const Sequelize = require('sequelize');
const fs = require('fs');

const router = express.Router();

const { Users, Orders, Products, Categories, 
  ShippingItemPrice, SubscriptionEmails, 
  PasswordToken, ClientContact } = require('../../models');

const authenticateJWT = require('../../middleware/authenticate');
const { sendSalesEmail, sendTokenEmail } = require('../../utils');

const errorHandler = (err, res) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: { message: err.message } });
};

const performDailyTask = async () => {
  try {
    await PasswordToken.update(
      { token_count: 0 }, // Set token_count to 0
      {
        where: {
          token_count: {
            [Sequelize.Op.gt]: 0, // Greater than 0
          }
        },
        returning: true, // Return the updated records
      }
    );

  } catch (error) {
    console.error('Error executing PostgreSQL query:', error);
  }
}

schedule.scheduleJob('0 0 * * *', performDailyTask);

const generateRandomString = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }

  return randomString;
}

router.post('/contacts', async (req, res) => {
  const rawBody = req.body.toString();
  const {first_name, last_name, email, message} = JSON.parse(rawBody);

  try{
    const contact_details = await ClientContact.create({ first_name, last_name, email, message})

    if (contact_details){
      res.json({
        response_code: 200,
        response_message:"Contact details created successfully"
      })
    }else{
      res.json({
        response_code: 300,
        response_message:"Contact details creation failed"
      })
    }
  }catch(err){
    res.json({
      response_code: 300,
      response_message: err.message
    })
  }
  
})

router.post('/email-subscription', async (req, res) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  try{
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
  }catch(err){
    res.json({
      response_code: 300,
      response_message: err.message
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

router.post('/send-token', async (req, res) => {
  const rawBody = req.body.toString();
  const { username } = JSON.parse(rawBody);
 
  const check_user = await PasswordToken.findOne({
    where: { username } 
  })

  if (check_user){
    if (check_user.token_count >= 3){
      return res.status(200).json({ response_code: 204, response_message: "Attempts to change password for today have been exhausted. Please try again in 24Hrs"});
    }

    let timed_expired = new Date();
    timed_expired.setMinutes(timed_expired.getMinutes() + 20);
    let user_token = generateRandomString(6)

    check_user.timed_expired = timed_expired
    check_user.user_token = user_token
    check_user.token_count = check_user.token_count + 1

    await check_user.save()

    const {email} = await Users.findOne({where: {username}})
    if (email){
      await sendTokenEmail(email, user_token)
      return res.status(200).json({ response_code: 200, response_message: "Token has been sent to your email"});
    }

    return res.status(200).json({ response_code: 203, response_message: "Attempts to send token failed. Please try again later"});
  }else{
    try{
      let timed_expired = new Date();
      timed_expired.setMinutes(timed_expired.getMinutes() + 20);
      let user_token = generateRandomString(6)
      const pass_token = await PasswordToken.create({username, user_token, timed_expired, token_count: 0})
  
      if (pass_token) {
        const {email} = await Users.findOne({where: {username}})
        if (email){
          await sendTokenEmail(email, user_token)
          return res.status(200).json({ response_code: 200, response_message: "Token has been sent to your email"});
        }
        return res.status(200).json({ response_code: 203, response_message: "Attempts to send token failed. Please try again later"});
      }
  
      return res.status(200).json({ response_code: 203, response_message: "Attempts to send token failed. Please try again later"});
    }catch(err){
      return res.status(200).json({ response_code: 203, response_message: "Attempts to send token failed. Please try again later"});
    }
  }
})

router.post('/check-token', async (req, res) => {
  const rawBody = req.body.toString();
  const { username, user_token } = JSON.parse(rawBody);
  
  try{
    const pass_token = await PasswordToken.findOne({
      where: { username, user_token },
    })

    if (pass_token) {
      let now_date = new Date();
      if (pass_token.timed_expired > now_date) {
        return res.status(200).json({ response_code: 200});
      }
      return res.status(200).json({ response_code: 203});
    }
    return res.status(200).json({ response_code: 203});
  }catch(err){
    return res.status(200).json({ response_code: 204});
  }
})

router.get('/test-email', (req, res) => {
  const resp = sendSalesEmail('fkay0450@gmail.com', '72314504-6c99-4bb8-b302-109b1f419920')
  res.json({
    response_code: 200,
    response_message: resp
  })
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
