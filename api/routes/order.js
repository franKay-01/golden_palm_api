const express = require('express');

const router = express.Router();
router.use(express.raw({ type: '*/*' }));

const { Orders, OrderItems, Products } = require('../../models');
const utils = require('../../utils').default;
const authenticateJWT = require('../../middleware/authenticate')

router.get('/', async (req, res, next) => {
  try{
    const orders = await Orders.findAll({include: ['users', 'shipping']})
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

router.get('/customer', authenticateJWT, async (req, res, next) => {
  try{
    const orders = await Orders.findAll({
      where: { user_reference_no: req.user.id },
      include: [
        {
          model: OrderItems, // Use the model name, not 'orderItems'
          as: 'orderItems', // This should match the alias you defined in the association
          include: [
            {
              model: Products, // Use the model name, not 'products'
              as: 'products', // This should match the alias you defined in the association
            },
          ],
        },
      ],
    })

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
  // const {product_reference_no, shipping_address_reference_no, user_reference_no, quantity, amount, other_info, username} = req.body;
  const { order_items, order } = req.body
  try{
    // const product_reference_no_json = { ...product_reference_no }
    const user_reference_no = req.user
    const order_custom_id = user_reference_no.concat(utils.dateFormat())

    const order_info = await Orders.create({order_custom_id, user_reference_no , quantity: order.quantity, amount: order.amount, other_info: order.other_info})
    
    const order_reference_no = order_info.reference_no
    const webhook_event_id = order_reference_no.concat("-", amount);

    for (const order_item of order_items) {
      const { product_reference_no, quantity, unit_amount } = order_item;

      await OrderItems.create({ order_reference_no, product_reference_no, quantity, unit_amount })
    }
    
    res.status(200).json({
      message:"Order placement process started. You'll be notified via email"
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

router.get('/:reference_no', async (req, res, next) => {
  const {reference_no} = req.params;

  const orders = await Orders.findOne({
    where: { reference_no },
    include: [
      {
        model: OrderItems, // Use the model name, not 'orderItems'
        as: 'orderItems', // This should match the alias you defined in the association
        include: [
          {
            model: Products, // Use the model name, not 'products'
            as: 'products', // This should match the alias you defined in the association
          },
        ],
      },
    ],
  })

  return res.json({
    response_code: 200,   
    orders
  })
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

module.exports = router;