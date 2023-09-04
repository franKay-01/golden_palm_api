const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');

// const Queue = require('bull');
// const queue = new Queue('myQueue');
const { Worker } = require('worker_threads');
const stripe = require('stripe')('sk_test_51NSUKABozIprrApfjBLBfdYzgdfxtML7IrPlvivhekTKskRetoGx8y3luTVwQhJjQnsvp7fbruXUoa2eRm5bEzOA00zvB4hLrN');

const router = express.Router();
router.use(express.raw({ type: '*/*' }));

const { Orders } = require('../../models');
const { formattedDate } = require('../../utils');
const authenticateJWT = require('../../middleware/authenticate')

router.get('/', async (req, res, next) => {
  try{
    const orders = await Orders.findAll({include: ['users', 'shipping']})
    return res.json({
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
    const orders = await Orders.findOne({
      where: { user_reference_no: req.user.id },
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
    const order_custom_id = user_reference_no.concat(formattedDate)

    const order_info = await Orders.create({order_custom_id, user_reference_no , quantity: order.quantity, amount: order.amount, other_info: order.other_info})
    
    const order_reference_no = order_info.reference_no
    const webhook_event_id = order_reference_no.concat("-", amount);

    for (const order_item of order_items) {
      const { product_reference_no, quantity, unit_amount } = order_item;
      await new Promise((resolve, reject) => {
        const worker = new Worker('./jobs/createOrder.js', {
          workerData: {
            order_reference_no,
            product_reference_no,
            webhook_event_id,
            quantity,
            unit_amount
          },
        });
        
        worker.on('message', (message) => {
          console.log('Worker task completed:', message);
          resolve();
        });
        
        worker.on('error', (error) => {
          console.error('Worker task encountered an error:', error);
          reject(error);
        });
      });
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
  try{
    const order = await Orders.findOne({
      where: { reference_no },
      // include: ['users']
    })

    return res.json({
      order
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