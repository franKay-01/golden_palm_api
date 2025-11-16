const express = require('express');

const router = express.Router();

const { Orders, OrderItems, Products, CuratedBundles, Categories, sequelize } = require('../../models');
const { dateFormat, sendSalesEmail, sendTrackingEmail, sendReviewEmail } = require('../../utils');
const { authenticateJWT } = require('../../middleware/authenticate')

router.get('/', async (req, res, next) => {
  try{
    const orders = await Orders.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: OrderItems,
          as: 'orderItems'
        }
      ]
    })

    // Manually fetch products/bundles for each order item
    for (const order of orders) {
      for (const item of order.orderItems) {
        if (item.item_type === 'product') {
          item.dataValues.itemDetails = await Products.findOne({
            where: { sku: item.item_reference_no },
            include: [{ model: Categories, as: 'categories' }]
          });
        } else if (item.item_type === 'bundle') {
          // Fetch bundle details
          item.dataValues.itemDetails = await CuratedBundles.findOne({
            where: { bundle_id: item.item_reference_no }
          });

          // Fetch bundle contents from order_bundle_items
          const bundleContents = await sequelize.query(
            `SELECT product_sku, product_name, product_price, product_img_url, is_hot
             FROM order_bundle_items
             WHERE order_item_id = :order_item_id
             ORDER BY id`,
            {
              replacements: { order_item_id: item.id },
              type: sequelize.QueryTypes.SELECT
            }
          );

          item.dataValues.bundleContents = bundleContents;
        }
      }
    }

    return res.json({
      response_code: '000',
      orders,
      response_message: 'Orders retrieved successfully'
    })
  }catch(err){
    res.status(err.status || 500).json({
      response_code: '001',
      error: {
        message: err.message
      }
    })
  }
})

router.get('/customer', authenticateJWT, async (req, res, next) => {
  try{
    const orders = await Orders.findAll({
      where: { user_reference_no: req.user.id },
      include: [
        {
          model: OrderItems,
          as: 'orderItems'
        }
      ],
    })

    // Manually fetch products/bundles for each order item
    for (const order of orders) {
      for (const item of order.orderItems) {
        if (item.item_type === 'product') {
          item.dataValues.itemDetails = await Products.findOne({
            where: { sku: item.item_reference_no },
            include: [{ model: Categories, as: 'categories' }]
          });
        } else if (item.item_type === 'bundle') {
          // Fetch bundle details
          item.dataValues.itemDetails = await CuratedBundles.findOne({
            where: { bundle_id: item.item_reference_no }
          });

          // Fetch bundle contents from order_bundle_items
          const bundleContents = await sequelize.query(
            `SELECT product_sku, product_name, product_price, product_img_url, is_hot
             FROM order_bundle_items
             WHERE order_item_id = :order_item_id
             ORDER BY id`,
            {
              replacements: { order_item_id: item.id },
              type: sequelize.QueryTypes.SELECT
            }
          );

          item.dataValues.bundleContents = bundleContents;
        }
      }
    }

    return res.json({
      response_code: 200,
      orders
    })

  }catch(err){
    res.status(err.status || 500)
    res.json({
      error: {
        message: err.message
      }
    })
  }

})

router.post('/', authenticateJWT,  async (req, res, next) => {
  const { order_items, order } = req.body
  try{
    const user_reference_no = req.user.email
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const order_custom_id = user_reference_no + '-' + dateFormat() + '-' + randomSuffix

    const order_info = await Orders.create({
      order_custom_id,
      user_reference_no,
      quantity: order.quantity,
      amount: order.amount,
      other_info: order.other_info
    })

    const order_reference_no = order_info.reference_no

    for (const order_item of order_items) {
      const { item_reference_no, item_type, quantity, unit_amount, desc, heat_level } = order_item;

      await OrderItems.create({
        order_reference_no,
        item_reference_no,
        item_type: item_type || 'product',
        quantity,
        unit_amount,
        desc: desc || 'Product',
        heat_level: heat_level || null
      })
    }

    res.status(200).json({
      response_code: '000',
      response_message: "Order placement process started. You'll be notified via email",
      order_reference_no
    })
  }catch(err){
    res.status(err.status || 500).json({
      response_code: '001',
      error: {
        message: err.message
      }
    })
  }
})

router.get('/:reference_no', async (req, res, next) => {
  const {reference_no} = req.params;

  try{
    const orders = await Orders.findOne({
      where: { reference_no },
      include: [
        {
          model: OrderItems,
          as: 'orderItems'
        }
      ],
    })

    // Manually fetch products/bundles for each order item
    if (orders && orders.orderItems) {
      for (const item of orders.orderItems) {
        if (item.item_type === 'product') {
          item.dataValues.itemDetails = await Products.findOne({
            where: { sku: item.item_reference_no },
            include: [{ model: Categories, as: 'categories' }]
          });
        } else if (item.item_type === 'bundle') {
          // Fetch bundle details
          item.dataValues.itemDetails = await CuratedBundles.findOne({
            where: { bundle_id: item.item_reference_no }
          });

          // Fetch bundle contents from order_bundle_items
          const bundleContents = await sequelize.query(
            `SELECT product_sku, product_name, product_price, product_img_url, is_hot
             FROM order_bundle_items
             WHERE order_item_id = :order_item_id
             ORDER BY id`,
            {
              replacements: { order_item_id: item.id },
              type: sequelize.QueryTypes.SELECT
            }
          );

          item.dataValues.bundleContents = bundleContents;
        }
      }
    }

    return res.json({
      response_code: "000",
      orders
    })
  }catch(err){
    res.status(err.status || 500).json({
      response_code: '001',
      error: {
        message: err.message
      }
    })
  }
})

router.patch('/:id', (req, res, next) => {
  const animalId = req.params.id;
  res.status(200).json({
    message: `Updated animal record`
  })
})

router.delete('/:id', (req, res, next) => {
  const animalId = req.params.id;
  res.status(200).json({
    message: `Updated animal record`
  })
})

router.post('/send-receipt', async (req, res, next) => {
  const { email, order_reference_no } = req.body;

  try {
    if (!email || !order_reference_no) {
      return res.status(400).json({
        response_code: '001',
        error: {
          message: 'Email and order_reference_no are required'
        }
      });
    }

    // Verify order exists
    const order = await Orders.findOne({
      where: { reference_no: order_reference_no }
    });

    if (!order) {
      return res.status(404).json({
        response_code: '001',
        error: {
          message: 'Order not found'
        }
      });
    }

    // Send the sales email
    await sendSalesEmail(email, order_reference_no);

    return res.status(200).json({
      response_code: '000',
      response_message: 'Receipt sent successfully'
    });
  } catch (err) {
    res.status(err.status || 500).json({
      response_code: '001',
      error: {
        message: err.message
      }
    });
  }
});

router.post('/send-tracking', async (req, res, next) => {
  const { order_reference_no, tracking_id } = req.body;

  try {
    if (!order_reference_no || !tracking_id) {
      return res.status(400).json({
        response_code: '001',
        error: {
          message: 'order_reference_no and tracking_id are required'
        }
      });
    }

    // Verify order exists
    const order = await Orders.findOne({
      where: { reference_no: order_reference_no }
    });

    if (!order) {
      return res.status(404).json({
        response_code: '001',
        error: {
          message: 'Order not found'
        }
      });
    }

    // Send the tracking email
    const result = await sendTrackingEmail(order_reference_no, tracking_id);

    if (!result) {
      return res.status(500).json({
        response_code: '001',
        error: {
          message: 'Failed to send tracking email'
        }
      });
    }

    return res.status(200).json({
      response_code: '000',
      response_message: 'Tracking email sent successfully'
    });
  } catch (err) {
    res.status(err.status || 500).json({
      response_code: '001',
      error: {
        message: err.message
      }
    });
  }
});

router.post('/send-review', async (req, res, next) => {
  const { email, order_reference_no } = req.body;

  try {
    // Validate input
    if (!email || !order_reference_no) {
      return res.status(400).json({
        response_code: '001',
        response_message: 'Email and order reference number are required'
      });
    }

    // Check if order exists
    const order = await Orders.findOne({
      where: { reference_no: order_reference_no }
    });

    if (!order) {
      return res.status(404).json({
        response_code: '001',
        response_message: 'Order not found'
      });
    }

    // Send review email
    const emailSent = await sendReviewEmail(email, order_reference_no);

    if (!emailSent) {
      return res.status(500).json({
        response_code: '001',
        response_message: 'Failed to send review email'
      });
    }

    res.status(200).json({
      response_code: '000',
      response_message: 'Review email sent successfully'
    });
  } catch (err) {
    res.status(err.status || 500).json({
      response_code: '001',
      error: {
        message: err.message
      }
    });
  }
});

module.exports = router;