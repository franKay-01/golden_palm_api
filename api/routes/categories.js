const express = require('express');
const router = express.Router();
const { Categories } = require('../../models');
const authenticateJWT = require('../../middleware/authenticate')

router.get('/', authenticateJWT, async (req, res, next) => {
  try{
    const category = await Categories.findAll({include: ['products']})
    return res.json({
      category: category
    })
  }catch(err){
    console.log(err)
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.post('/', async (req, res, next) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);
  const { category_name } = parsedBody;
  
  try{

    await Categories.create({name: category_name})
    res.status(200).json({
      response_message:"category INFO",
      response_code: '000'
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
  const category_ref_no = req.params.reference_no;
  try{
    const user = await Categories.findOne({
      where: { category_ref_no }
    })

    return res.json({
      users: user
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