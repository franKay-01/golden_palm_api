const express = require('express');
const router = express.Router();
const { Roles } = require('../../models');

router.get('/', async (req, res, next) => {
  try{
    const roles = await Roles.findAll()
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
  const { role_name } = req.body;
  try{

    const role = await Roles.create({role_name})
    res.status(200).json({
      message:"category INFO",
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

router.get('/:reference_no', async (req, res, next) => {
  const reference_no = req.params.reference_no;
  try{
    const role = await Roles.findOne({
      where: { reference_no }
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