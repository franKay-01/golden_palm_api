const express = require('express');
const router = express.Router();
const {SpiceType} = require('../../models');

router.get('/', async (req, res, next) => {
  try{
    const spiceTypes = await SpiceType.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      response_code: 200,
      spice_types: spiceTypes
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

router.post('/', async (req, res, next) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const {name, description} = parsedBody;
  try{
    const spiceTypeInfo = await SpiceType.create({
      name,
      description,
    })

    res.status(200).json({
      response_message:"spice type successfully created",
      response_code: '000',
      spice_type_ref_no: spiceTypeInfo.spice_type_id
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
    const single_spice_type = await SpiceType.findOne({
      where: { spice_type_id: referenceNo }
    })

    if (!single_spice_type) {
      return res.status(404).json({
        response_message:"spice type not found",
        response_code: '404'
      })
    }

    return res.json({
      response_message:"spice type successfully retrieved",
      response_code: '000',
      spice_type: single_spice_type
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

  const {spice_type_id} = parsedBody;

  try{
    const spiceType = await SpiceType.findOne({where: { spice_type_id } })

    if (!spiceType) {
      return res.status(404).json({
        response_message:"spice type not found",
        response_code: '404'
      })
    }

    spiceType.is_active = !spiceType.is_active
    await spiceType.save()

    res.status(200).json({
      response_message:"spice type status updated",
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

router.post('/:spice_type_id', async (req, res, next) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const {name, description, spice_type_id} = parsedBody;

  try{
    const spiceType = await SpiceType.findOne({where: { spice_type_id } })

    if (!spiceType) {
      return res.status(404).json({
        response_message:"spice type not found",
        response_code: '404'
      })
    }

    spiceType.name = name
    spiceType.description = description

    await spiceType.save()

    res.status(200).json({
      response_message:"Spice type updated successfully",
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

router.post('/remove/:spice_type_id', async (req, res, next) => {
  const spice_type_id = req.params.spice_type_id;

  try {
    const spiceType = await SpiceType.findOne({where: { spice_type_id } })

    if (!spiceType) {
      return res.status(404).json({
        response_message:"spice type not found",
        response_code: '404'
      })
    }

    spiceType.is_active = false;
    await spiceType.save()

    res.status(200).json({
      response_message:"Spice type deactivated successfully",
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

router.post('/add/:spice_type_id', async (req, res, next) => {
  const spice_type_id = req.params.spice_type_id;

  try {
    const spiceType = await SpiceType.findOne({where: { spice_type_id } })

    if (!spiceType) {
      return res.status(404).json({
        response_message:"spice type not found",
        response_code: '404'
      })
    }

    spiceType.is_active = true;
    await spiceType.save()

    res.status(200).json({
      response_message:"Spice type activated successfully",
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

module.exports = router;