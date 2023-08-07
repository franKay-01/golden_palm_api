const express = require('express');
const router = express.Router();
const { ShippingAddress } = require('../../models');

router.get('/', async (req, res, next) => {
  try{
    const address = await ShippingAddress.findAll({include: ['users']})
    return res.json({
      address
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
  const { street_name, city, country, state, postal_code, reference_no } = req.body;
  try{

    const existingChild = await ShippingAddress.findOne({ where: { reference_no: reference_no } });

    if (existingChild) {
      throw new Error('A shipping address already exists for this USER.');
    }

    const address = await ShippingAddress.create({street_name, city, country, state, postal_code, reference_no})
    res.status(200).json({
      message:"address INFO",
      address
    })
  }catch(err){
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.get('/:address_sku', async (req, res, next) => {
  const { address_sku } = req.params;
  try{
    const address = await ShippingAddress.findOne({
      where: { address_sku }
    })

    return res.json({
        address
    })
  }catch(err){
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
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