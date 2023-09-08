const express = require('express');
const router = express.Router();
require('dotenv').config();

const { StripeTransactionInfo, Orders, OrderItems } = require('../../models');
const stripe = require('stripe')(process.env.STRIPE_KEY);
const authenticateJWT = require('../../middleware/authenticate')
const formattedDate = require('../../utils');

router.get('/', async (req, res, next) => {
  try{
    const roles = await StripeTransactionInfo.findAll()
    return res.json({
      roles
    })
  }catch(err){
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.post('/', async (req, res, next) => {
  const { webhook_event_id, payment_info_reference_no, amount } = req.body;
  try{

    const stripe_payment_info = await StripeTransactionInfo.create({webhook_event_id, payment_info_reference_no, amount})
    res.status(200).json({
      message:"category INFO",
      stripe_payment_info
    })
  }catch(err){
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.get('/:reference_no', async (req, res, next) => {
  const {order_payment_info} = req.params;
  try{
    const role = await StripeTransactionInfo.findOne({
      where: { order_payment_info }
    })

    return res.json({
      role
    })
  }catch(err){
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})


router.post('/create-checkout-session', authenticateJWT, async (req, res) => {
  
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);
  try {
    const customer = await stripe.customers.create({
      metadata: {
        userId: req.user.id,
        cart: JSON.stringify(parsedBody),
      },
    });

    const line_items = parsedBody.map((item) => {
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            // images: [item.image],
            description: item.desc,
            metadata: {
              id: item.reference_no,
            },
          },
          unit_amount: item.price * 100,
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GH"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 0,
              currency: "usd",
            },
            display_name: "Free shipping",
            // Delivers between 5-7 business days
            delivery_estimate: {
              minimum: {
                unit: "business_day",
                value: 5,
              },
              maximum: {
                unit: "business_day",
                value: 7,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 1500,
              currency: "usd",
            },
            display_name: "Next day air",
            // Delivers in exactly 1 business day
            delivery_estimate: {
              minimum: {
                unit: "business_day",
                value: 1,
              },
              maximum: {
                unit: "business_day",
                value: 3,
              },
            },
          },
        },
      ],
      automatic_tax:{
        enabled: true,
      },
      customer_update: {
        shipping: 'auto'
      },
      phone_number_collection: {
        enabled: true,
      },
      line_items,
      mode: "payment",
      customer: customer.id,
      success_url: `http://localhost:3000/success`,
      cancel_url: `http://localhost:3000/cart`,
    });
  
    res.send({ response_code: 200, url: session.url });
  }catch(err){
    console.log("ERROR "+err)
    res.send({ response_code: 400, url: '' });
  }
});


const createOrder = async (customer, data) => {
  const Items = JSON.parse(customer.metadata.cart);

  const user_reference_no = customer.metadata.userId
  const order_custom_id = user_reference_no.concat(formattedDate)

  const order_info = await Orders.create({
    order_custom_id,
    user_reference_no, 
    quantity: Items.length, 
    amount: data.amount_subtotal/100, 
    other_info: `${data.customer_details.address.city},${data.customer_details.address.line1},${data.customer_details.email},${data.customer_details.phone}`
  })
  
  const order_reference_no = order_info.reference_no

  for (const order_item of Items) {
    const { product_id, quantity, unit_amount } = order_item;
    await OrderItems.create({ order_reference_no, product_reference_no: product_id, quantity, unit_amount })
  }
};
// This is your Stripe CLI webhook secret for testing your endpoint locally.

router.post('/webhook', express.json({ type: "application/json" }), (request, response) => {
  const sig = request.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const data = event.data.object;
      stripe.customers
        .retrieve(data.customer)
        .then(async (customer) => {
          try {
            // CREATE ORDER
            createOrder(customer, data);
          } catch (err) {
            console.log(typeof createOrder);
            console.log(err);
          }
        })
        .catch((err) => console.log(err.message));
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.status(200).end();
});


router.patch('/:id', (req, res, next) => {
  res.status(200).json({
    message: `Updated user record`
  })
})

router.delete('/:id', (req, res, next) => {
  res.status(200).json({
    message: `Updated user record`
  })
})

module.exports = router;