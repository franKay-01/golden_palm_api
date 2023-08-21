const express = require('express');
const router = express.Router();
const {Users, Products} = require('../../models');

router.get('/', async (req, res, next) => {
  try{
    const products = await Products.findAll({
      where: {is_active: true}
    })
    
    return res.json({
      response_code: '000',
      products
    })
  }catch(err){
    console.log(JSON.stringify(err))
    res.status(err.status || 500)
    res.json({
      error: {
        message: err.message
      }
    })
  }
})

router.post('/', async (req, res, next) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const {name, description, price, category_ref_no, img_url} = parsedBody;
  try{
    const productInfo = await Products.create({name, description, price, quantity: 0, category_ref_no, img_url})
    res.status(200).json({
      response_message:"product INFO",
      response_code: '000',
      product_ref_no: productInfo.sku
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

router.get('/:referenceNo', async (req, res, next) => {
  const referenceNo = req.params.referenceNo;
  try{
    const animal = await Products.findOne({
      where: { referenceNo },
      // include: ['users']
    })

    return res.json({
      animal: animal
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

router.post('/status', async (req, res, next) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const {sku} = parsedBody;

    
  try{
    const product = await Products.findOne({where: { sku } })

    product.is_active = !product.is_active
    await product.save()
  
    res.status(200).json({
      response_message:"product editted",
      response_code: '000'
    })
  }catch{
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.post('/edit', async (req, res, next) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const {name, description, price, category_ref_no, img_url, sku} = parsedBody;
  
  try{
    const product = await Products.findOne({where: { sku } })
    product.name = name
    product.description = description
    product.price = price
    product.category_ref_no = category_ref_no
    product.img_url = img_url
  
    await product.save()
  
    res.status(200).json({
      response_message:"product editted",
      response_code: '000'
    })
  }catch{
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.delete('/:id', (req, res, next) => {
  const animalId = req.params.id;
  res.status(200).json({
    message: `Updated animal record`
  })
})

module.exports = router;