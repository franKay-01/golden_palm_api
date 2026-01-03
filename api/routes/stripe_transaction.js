const express = require('express');
const geolib = require('geolib');
const zipcode = require('zipcodes');

const router = express.Router();
require('dotenv').config();

const { StripeTransactionInfo, Orders, OrderItems, ShippingItemPrice, CheckoutSessions, Products, CuratedBundles, sequelize } = require('../../models');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateJWT } = require("../../middleware/authenticate");
const { sendSalesEmail, dateFormat } = require('../../utils');

let percentageChange = 0;
const OriginalZipCode = '85001';

const getShippingPrice = async () => {
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

const getCoordinatesForZIP = (zipCode) => {
  // Clean zipcode (remove spaces, handle ZIP+4 format)
  const cleanZip = String(zipCode).trim().split('-')[0];
  const location = zipcode.lookup(cleanZip);

  if (location) {
    return {
      latitude: parseFloat(location.latitude),
      longitude: parseFloat(location.longitude)
    };
  } else {
    console.log("LOCATION FAILED for zipcode:", zipCode, "cleaned:", cleanZip)
    return null;
  }
}

const calculatedShippingCost = async (fromZip, toZip, weight = 4) => {
  try {
    const distance = getDistance(fromZip, toZip);

    if (!distance) {
      console.log("Distance calculation failed");
      return "Not Found";
    }

    // Convert distance to a USPS-like zone
    let zone = 1;
    if (distance <= 50) zone = 1;
    else if (distance <= 150) zone = 2;
    else if (distance <= 300) zone = 3;
    else if (distance <= 600) zone = 4;
    else if (distance <= 1000) zone = 5;
    else if (distance <= 1400) zone = 6;
    else if (distance <= 1800) zone = 7;
    else zone = 8;

    let baseCost = 5.15; // starting for ~1lb
    if (weight <= 1) baseCost += 0.25;
    else if (weight <= 3) baseCost += 0.75;
    else if (weight <= 5) baseCost += 1.75;
    else if (weight <= 7) baseCost += 2.20;
    else baseCost += 3.00;

    // Each zone adds a small multiplier
    const zoneMultiplier = 1 + (zone - 1) * 0.05; // +5% per zone increase
    const totalCost = (baseCost * zoneMultiplier).toFixed(2);

    return parseFloat(totalCost);
  } catch (error) {
    console.error('Error calculating shipping:', error);
    return "Not Found";
  }
};

// const calculatedShippingCost = async (zipCode1, zipCode2, weight = 4) => {
//   const distance = calculateDistance(zipCode1, zipCode2);

//   if (distance === null) {
//     console.log("Distance calculation failed");
//     return "Not Found";
//   }

//   const startingCostDetails = 5

//   percentageChange = (parseFloat(5)/100)

//   if (distance !== null) {
//     const calculatedDistance = distance.toFixed(2)
//     let startingCost = parseFloat(startingCostDetails); // Default starting cost
//     let actualCost = 0.0

//     if (weight >= 1 && weight <= 3) {
//       startingCost += 0.75; // Add $2 for packages weighing 1-3 pounds
//     } else if (weight > 3 && weight <= 5) {
//       startingCost += 1.75; // Add $5 for packages weighing 4-5 pounds
//     } else if (weight > 5 && weight <= 7) {
//       startingCost += 2.20; // Add $10 for packages weighing 6-7 pounds
//     }
  
//     switch (true) {
//       case (calculatedDistance >= 0 && calculatedDistance <= 50):
//         return startingCost;
//       case (calculatedDistance >= 51 && calculatedDistance <= 150):
//         actualCost = startingCost + (startingCost * percentageChange);
//         return actualCost;
//       case (calculatedDistance >= 151 && calculatedDistance <= 300):
//         actualCost = startingCost + (startingCost * percentageChange * 3);
//         return actualCost;
//       case (calculatedDistance >= 301 && calculatedDistance <= 600):
//         actualCost = startingCost + (startingCost * percentageChange * 4);
//         return actualCost;
//       case (calculatedDistance >= 601 && calculatedDistance <= 1000):
//         actualCost = startingCost + (startingCost * percentageChange * 5);
//         return actualCost;
//       case (calculatedDistance >= 1001 && calculatedDistance <= 1400):
//         actualCost = startingCost + (startingCost * percentageChange * 6);
//         return actualCost;
//       case (calculatedDistance >= 1401 && calculatedDistance <= 1800):
//         actualCost = startingCost + (startingCost * percentageChange * 7);
//         return actualCost;
//       case (calculatedDistance > 1801):
//         actualCost = startingCost + (startingCost * percentageChange * 8);
//         return actualCost;
//       default:
//         return startingCost;
//     }
    
//   } else {
//     console.log('One or both ZIP codes could not be found.');
//     return ("Not Found")
//   }
// }

const getDistance = (zipCode1, zipCode2) => {
  const coordinates1 = getCoordinatesForZIP(zipCode1);
  const coordinates2 = getCoordinatesForZIP(zipCode2);

  if (coordinates1 && coordinates2) {
    // Use getPreciseDistance for better accuracy
    const distanceMeters = geolib.getPreciseDistance(coordinates1, coordinates2);
    const distanceMiles = distanceMeters / 1609.344; // 1 mile is approximately 1609.344 meters

    console.log(`Distance from ${zipCode1} to ${zipCode2}: ${distanceMiles.toFixed(2)} miles`);
    return parseFloat(distanceMiles.toFixed(2));
  } else {
    console.log(`Could not calculate distance between ${zipCode1} and ${zipCode2}`);
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
    const stripeTransaction = await StripeTransactionInfo.findOne({
      where: { order_payment_info }
    })

    return res.json({
      stripeTransaction
    })
  }catch(err){
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.post('/create-checkout-session', async (req, res) => {

  const {zipcode, email, shipping_address, cart, phone_number} = req.body;

  try {
    // Validate cart prices against database to prevent manipulation
    for (const item of cart) {
      let actualPrice = null;

      if (item.type === 'product') {
        const product = await Products.findOne({
          where: { sku: item.id }
        });

        if (!product) {
          return res.status(200).json({
            response_code: 302,
            msg: `Product with ID ${item.id} not found`
          });
        }

        actualPrice = parseFloat(product.price);
      } else if (item.type === 'bundle') {
        const bundle = await CuratedBundles.findOne({
          where: { reference_no: item.id }
        });

        if (!bundle) {
          return res.status(200).json({
            response_code: 303,
            msg: `Bundle with ID ${item.id} not found`
          });
        }

        actualPrice = parseFloat(bundle.price);
      } else {
        return res.status(200).json({
          response_code: 304,
          msg: `Invalid item type: ${item.type}`
        });
      }

      // Compare prices (allow 0.01 difference for floating point precision)
      const cartPrice = parseFloat(item.unit_price);
      if (Math.abs(actualPrice - cartPrice) > 0.01) {
        console.error(`Price mismatch for ${item.type} ${item.id}: Cart=${cartPrice}, DB=${actualPrice}`);
        return res.status(200).json({
          response_code: 305,
          msg: 'Price mismatch detected. Please refresh your cart and try again.'
        });
      }
    }

    const customer = await stripe.customers.create({
      email: email || undefined
    });

    const line_items = cart.map((item) => {
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            description: item.name,
            metadata: {
              id: item.id,
            },
          },
          unit_amount: item.unit_price * 100,
        },
        quantity: item.quantity,
      };
    });

    let total = 0;
    for (const item of cart) {
      total += parseInt(item.weight, 10);
    }

    const shippingCost = await calculatedShippingCost(OriginalZipCode, zipcode, total)

    if (shippingCost === "Not Found" || !shippingCost) {
      return res.status(400).json({
        response_code: 301,
        error: 'Invalid zipcode. Could not calculate shipping cost.'
      });
    }
    
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
      success_url: `https://goldenpalmfoods.com/payment-success`,
      cancel_url: `https://goldenpalmfoods.com/`,
    });

    // Save checkout session with full cart data to database
    await CheckoutSessions.create({
      stripe_session_id: session.id,
      stripe_customer_id: customer.id,
      cart_data: cart,  // Full cart with product_details
      email,
      zipcode,
      shipping_address,
      phone_number,
      status: 'pending'
    });

    res.send({ response_code: 200, url: session.url });
  }catch(err){
    console.error('Error creating checkout session:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack
    });
    res.send({ response_code: 400, url: '', error: err.message });
  }
});

const createOrder = async (sessionId, data) => {
  // Retrieve checkout session from database
  const checkoutSession = await CheckoutSessions.findOne({
    where: { stripe_session_id: sessionId }
  });

  if (!checkoutSession) {
    throw new Error('Checkout session not found');
  }

  const Items = checkoutSession.cart_data;

  const user_reference_no = data.customer_details.email
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
  const order_custom_id = dateFormat() + '-' + randomSuffix

  try {
    const order_info = await Orders.create({
      order_custom_id,
      user_reference_no,
      quantity: Items.length,
      amount: data.amount_subtotal/100,
      other_info: `${data.customer_details.address.city},${data.customer_details.address.line1},${data.customer_details.email},${data.customer_details.phone}`
    })

    const order_reference_no = order_info.reference_no

    for (const order_item of Items) {
      const { id, name, type, quantity, unit_price, heat_level, product_details } = order_item;

      if (type === 'product'){
        await OrderItems.create({
          order_reference_no,
          item_reference_no: id,
          item_type: type || 'product',
          quantity,
          unit_amount: unit_price,
          heat_level,
          desc: name || 'Product'
        })
      } else if (type === 'bundle') {
        // Store bundle as single item
        await OrderItems.create({
          order_reference_no,
          item_reference_no: id,
          item_type: 'bundle',
          quantity,
          unit_amount: unit_price,
          heat_level,
          desc: name || 'Bundle'
        })

        // Store bundle contents in order_bundle_items
        if (product_details && product_details.length > 0) {
          const orderItem = await OrderItems.findOne({
            where: { order_reference_no, item_reference_no: id }
          });

          for (const bundle_product of product_details) {
            await sequelize.query(
              `INSERT INTO order_bundle_items (order_item_id, product_sku, product_name, product_price, product_img_url, is_hot, "createdAt", "updatedAt")
               VALUES (:order_item_id, :product_sku, :product_name, :product_price, :product_img_url, :is_hot, NOW(), NOW())`,
              {
                replacements: {
                  order_item_id: orderItem.id,
                  product_sku: bundle_product.sku,
                  product_name: bundle_product.name,
                  product_price: bundle_product.price,
                  product_img_url: bundle_product.img_url || null,
                  is_hot: bundle_product.is_hot || false
                }
              }
            );
          }
        }
      }
    }

    // Update checkout session status
    await checkoutSession.update({
      status: 'completed',
      order_reference_no
    });

    return order_reference_no
  }catch(err){
    console.error('Error creating order:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack
    });
    return false
  }
};

router.post('/webhook', async (request, response) => {
  const sig = request.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_SECRET;
  let event;

  console.log("STRIPE WEBHOOK RECEIVED");
  console.log("Body type:", typeof request.body);
  console.log("Has signature:", !!sig);
  console.log("Has secret:", !!endpointSecret);

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    console.log("event.type ", event.type)
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      const data = event.data.object;

      try {
        const order_id = await createOrder(data.id, data);

        if (order_id) {
          console.log('Order created successfully, sending email...');
          await sendSalesEmail(data.customer_details.email, order_id);
        } else {
          console.error('Order creation failed, skipping email');
        }
      } catch (err) {
        console.error('Error in webhook handler:', err);
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

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