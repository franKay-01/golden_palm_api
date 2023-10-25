const express = require('express');
const router = express.Router();
const { OrderPaymentInfo } = require('../../models');


// Error handling middleware
const errorHandler = (err, res) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: { message: err.message } });
};


router.get('/', async (req, res, next) => {
  try{
    const roles = await OrderPaymentInfo.findAll()
    return res.json({
      roles
    })
  }catch(err){
    errorHandler(err, res);
  }
})

router.post('/', async (req, res, next) => {
  const { order_reference_no } = req.body;
  try{

    const order_payment_info = await OrderPaymentInfo.create({order_reference_no})
    res.status(200).json({
      message:"category INFO",
      order_payment_info
    })
  }catch(err){
    errorHandler(err, res);
  }
})

router.get('/:reference_no', async (req, res, next) => {
  const {order_payment_info} = req.params;
  try{
    const role = await OrderPaymentInfo.findOne({
      where: { order_payment_info }
    })

    return res.json({
      role
    })
  }catch(err){
    errorHandler(err, res);
  }
})

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