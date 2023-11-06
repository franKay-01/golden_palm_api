const express = require('express');
const geolib = require('geolib');
const zipcode = require('zipcodes');

const router = express.Router();
require('dotenv').config();

const { StripeTransactionInfo, Orders, OrderItems, ShippingItemPrice } = require('../../models');
const stripe = require('stripe')(process.env.STRIPE_KEY);
const authenticateJWT = require('../../middleware/authenticate')
const utils = require('../../utils').default;

let percentageChange = 0;
const OriginalZipCode = '85001';

async function getShippingPrice() {
  console.log("HERE SH")
  try{
    const shippingRates = await ShippingItemPrice.findOne({
      order: [ [ 'createdAt', 'DESC' ]]
    })
    
    return shippingRates;
    
  }catch (err){
    console.log("HERE ERR " + JSON.stringify(err))
    errorHandler(err, res);
  }
}

 
function getCoordinatesForZIP(zipCode) {
  const location = zipcode.lookup(zipCode);
  if (location) {
    return { latitude: location.latitude, longitude: location.longitude };
  } else {
    console.log("LOCATION FAILED")
    return res.status(200).json({ response_code: 301, error: 'Zipcode wrong' });
  }
}

async function calculatedShippingCost(zipCode1, zipCode2, weight = 4) {
  const distance = calculateDistance(zipCode1, zipCode2);
  const startingCostDetails = await getShippingPrice()

  percentageChange = (parseFloat(startingCostDetails.percentage)/100)

  if (distance !== null) {
    const calculatedDistance = distance.toFixed(2)
    let startingCost = parseFloat(startingCostDetails.price); // Default starting cost
    let actualCost = 0.0
    // Adjust the starting cost based on the weight of the package

    if (weight >= 1 && weight <= 3) {
      startingCost += 0.75; // Add $2 for packages weighing 1-3 pounds
    } else if (weight > 3 && weight <= 5) {
      startingCost += 1.75; // Add $5 for packages weighing 4-5 pounds
    } else if (weight > 5 && weight <= 7) {
      startingCost += 2.20; // Add $10 for packages weighing 6-7 pounds
    }
  
    switch (true) {
      case (calculatedDistance >= 0 && calculatedDistance <= 50):
        return startingCost;
      case (calculatedDistance >= 51 && calculatedDistance <= 150):
        actualCost = startingCost + (startingCost * percentageChange);
        return actualCost;
      case (calculatedDistance >= 151 && calculatedDistance <= 300):
        actualCost = startingCost + (startingCost * percentageChange * 3);
        return actualCost;
      case (calculatedDistance >= 301 && calculatedDistance <= 600):
        actualCost = startingCost + (startingCost * percentageChange * 4);
        return actualCost;
      case (calculatedDistance >= 601 && calculatedDistance <= 1000):
        actualCost = startingCost + (startingCost * percentageChange * 5);
        return actualCost;
      case (calculatedDistance >= 1001 && calculatedDistance <= 1400):
        actualCost = startingCost + (startingCost * percentageChange * 6);
        return actualCost;
      case (calculatedDistance >= 1401 && calculatedDistance <= 1800):
        actualCost = startingCost + (startingCost * percentageChange * 7);
        return actualCost;
      case (calculatedDistance > 1801):
        actualCost = startingCost + (startingCost * percentageChange * 8);
        return actualCost;
      default:
        return startingCost;
    }
    
  } else {
    console.log('One or both ZIP codes could not be found.');
    return ("Not Found")
  }
}

function calculateDistance(zipCode1, zipCode2) {
  const coordinates1 = getCoordinatesForZIP(zipCode1);
  const coordinates2 = getCoordinatesForZIP(zipCode2);

  if (coordinates1 && coordinates2) {
    const distanceMeters = geolib.getDistance(coordinates1, coordinates2);
    const distanceMiles = distanceMeters / 1609.344; // 1 mile is approximately 1609.344 meters
    return distanceMiles;
  } else {
    return null; // One or both ZIP codes could not be found
  }
}

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

  console.log("PARSED "+JSON.stringify(parsedBody))
  try {
    const customer = await stripe.customers.create({
      metadata: {
        userId: req.user.id,
        cart: JSON.stringify(parsedBody.cart),
      },
    });

    const line_items = parsedBody.cart.map((item) => {
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            description: item.desc,
            metadata: {
              id: item.reference_no,
            },
          },
          unit_amount: item.unit_price * 100,
        },
        quantity: item.quantity,
      };
    });

    let total = 0;
    for (const item of parsedBody.cart) {
      total += parseInt(item.quantity, 10);
    }

    const shippingCost = await calculatedShippingCost(OriginalZipCode, parsedBody.zipcode, ((total * 9)/ 16))
    
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
              amount: Math.round(shippingCost) * 100,
              currency: "usd",
            },
            display_name: "Shipping",
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
        }
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
    res.send({ response_code: 400, url: '' });
  }
});

const createOrder = async (customer, data) => {
  const Items = JSON.parse(customer.metadata.cart);

  const user_reference_no = customer.metadata.userId
  const order_custom_id = user_reference_no + '-' + utils.dateFormat()

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