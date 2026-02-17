const express = require('express');
const geolib = require('geolib');
const zipcode = require('zipcodes');

const router = express.Router();
require('dotenv').config();

const { StripeTransactionInfo, Orders, OrderItems, ShippingItemPrice, CheckoutSessions, Products, CuratedBundles, sequelize, Sequelize } = require('../../models');
const { Op } = Sequelize;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const stripe = require('stripe')(process.env.STRIPE_KEY);
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

const calculatedShippingCost = async (fromZip, toZip, weight = 20) => {
  try {
    const distance = getDistance(fromZip, toZip);

    if (!distance) {
      console.log("Distance calculation failed, defaulting to $10 shipping");
      return 10.00;
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

    // Zone-based flat pricing (ignoring weight)
    let shippingCost;
    if (zone >= 1 && zone <= 3) {
      shippingCost = 9.00; // Zones 1-3: $9
    } else if (zone >= 4 && zone <= 5) {
      shippingCost = 11.00; // Zones 4-5: $11
    } else {
      shippingCost = 12.00; // Zone 6 and above: $12
    }

    return shippingCost;
  } catch (error) {
    console.error('Error calculating shipping:', error);
    return 10.00;
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
          where: { bundle_id: item.id }
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

    let totalWeight = 0;
    let totalPrice = 0;
    let totalItems = 0;
    for (const item of cart) {
      totalWeight += parseInt(item.weight, 10);
      totalPrice += parseFloat(item.unit_price) * item.quantity;
      totalItems += item.quantity;
    }

    // Check if order has 20 or more items
    if (totalItems >= 20) {
      return res.status(200).json({
        response_code: 305,
        msg: 'For orders of 20 or more items, please contact us directly for a custom shipping quote.'
      });
    }

    // Calculate shipping cost based on number of items
    let shippingCost;
    if (totalItems >= 1 && totalItems <= 2) {
      shippingCost = 8.00;
    } else if (totalItems >= 3 && totalItems <= 4) {
      shippingCost = 10.00;
    } else {
      shippingCost = 13.00; // 5-9 items
    }

    // Calculate 3% of total order amount (including shipping) and add it to shipping cost
    const additionalFee = (totalPrice + shippingCost) * 0.03;
    const shippingCostWithFee = shippingCost + additionalFee;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      // billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: Math.round(shippingCostWithFee) * 100,
              currency: "usd",
            },
            display_name: "Shipping and Handling",
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
      // automatic_payment_methods: {
      //   enabled: true,
      // },
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
  const user_reference_no = data.customer_details.email;

  // Extract amounts first for duplicate check
  const subtotal = data.amount_subtotal ? data.amount_subtotal / 100 : 0;
  const taxAmount = data.total_details?.amount_tax ? data.total_details.amount_tax / 100 : 0;
  const shippingAmount = data.total_details?.amount_shipping ? data.total_details.amount_shipping / 100 : 0;
  const totalAmount = data.amount_total ? data.amount_total / 100 : subtotal + taxAmount + shippingAmount;

  // Check if order already exists in DB (prevent duplicates)
  // Look for same email and amount created in the last 5 minutes
  // const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  // const existingOrder = await Orders.findOne({
  //   where: {
  //     user_reference_no,
  //     amount: totalAmount,
  //     createdAt: { [Op.gte]: fiveMinutesAgo }
  //   }
  // });

  // if (existingOrder) {
  //   console.log('Duplicate order detected for:', user_reference_no, 'amount:', totalAmount);
  //   return null;
  // }

  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
  const order_custom_id = dateFormat() + '-' + randomSuffix

  try {
    // console.log("\n\n\n\n#################\n",data.customer_details.name, "\n#################\n\n\n")
    // console.log("\n\n\n\n#################\n",data.shipping_details?.address, "\n#################\n\n\n")
    // console.log("\n\n\n\n#################\n",data.customer_details?.address, "\n#################\n\n\n")

    // console.error('Error creating order:');
    // return false

    // Store order details as JSON in other_info
    const customerName = data.customer_details.name || 'N/A';
    const shipping = data.shipping_details?.address || {};
    const billing = data.customer_details?.address || {};

    // If billing address is incomplete (same as shipping was checked), use shipping address
    const billingComplete = billing.line1 && billing.city;
    const billingAddr = billingComplete ? billing : shipping;

    const otherInfo = JSON.stringify({
      customerName,
      email: data.customer_details.email,
      phone: data.customer_details.phone,
      shippingAddress: {
        line1: shipping.line1 || 'N/A',
        line2: shipping.line2 || '',
        city: shipping.city || 'N/A',
        state: shipping.state || '',
        postal_code: shipping.postal_code || '',
        country: shipping.country || 'US'
      },
      billingAddress: {
        line1: billingAddr.line1 || 'N/A',
        line2: billingAddr.line2 || '',
        city: billingAddr.city || 'N/A',
        state: billingAddr.state || '',
        postal_code: billingAddr.postal_code || '',
        country: billingAddr.country || 'US'
      },
      billingSameAsShipping: !billingComplete,
      tax: taxAmount,
      shipping: shippingAmount,
      total: totalAmount
    });

    const order_info = await Orders.create({
      order_custom_id,
      user_reference_no,
      quantity: Items.length,
      amount: totalAmount, // Store total amount including tax and shipping
      other_info: otherInfo
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

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    console.log("event.type ", event.type)
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      const payment_data = event.data.object;

      try {
        // Find checkout session associated with this payment intent
        const checkoutSessions = await stripe.checkout.sessions.list({
          payment_intent: payment_data.id,
          limit: 1
        });

        if (checkoutSessions.data.length > 0) {
          const checkoutSessionId = checkoutSessions.data[0].id;
          const checkoutSessionData = await stripe.checkout.sessions.retrieve(checkoutSessionId);

          // Use shipping from payment intent if checkout session lacks it
          if (!checkoutSessionData.shipping_details && payment_data.shipping) {
            checkoutSessionData.shipping_details = payment_data.shipping;
          }

          const order_id = await createOrder(checkoutSessionId, checkoutSessionData);

          if (order_id) {
            console.log('Order created successfully from payment_intent, sending email...');
            await sendSalesEmail(checkoutSessionData.customer_details.email, order_id);
          } else {
            console.error('Order creation failed, skipping email');
          }
        } else {
          console.log('No checkout session found for payment intent:', payment_data.id);
        }
      } catch (err) {
        console.error('Error in payment_intent webhook handler:', err);
      }
      break;
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