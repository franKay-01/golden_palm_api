const express = require('express');
const router = express.Router();
const { Categories } = require('../../models');
const { authenticateJWT, authenticateAdmin } = require('../../middleware/authenticate');

// Error handling middleware
const errorHandler = (err, res) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: { message: err.message } });
};

// Use express.json() to parse the request body
router.use(express.json());

router.get('/', authenticateJWT, async (req, res) => {
  try {
    const categories = await Categories.findAll({ include: ['products'] });

    if (categories.length === 0) {
      res.status(201).json({ response_code: '001', error: { message: 'No categories found' } });
    } else {
      res.json({ response_code: '000', categories, response_message: "Categories retrieved successfully" });
    }
  } catch (err) {
    errorHandler(err, res);
  }
});

router.post('/', authenticateAdmin, async (req, res) => {
  const { category_name } = req.body;
  
  try {
    await Categories.create({ name: category_name });
    res.status(201).json({
      response_message: "Category successfully created",
      response_code: '000'
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

router.get('/:reference_no', async (req, res) => {
  const reference_no = req.params.reference_no;
  try {
    const category = await Categories.findOne({ where: { reference_no } });
    if (!category) {
      return res.status(404).json({ error: { message: 'Category not found' } });
    }
    res.status(200).json({ response_code: '000', category });
  } catch (err) {
    errorHandler(err, res);
  }
});

router.post('/update', async (req, res, next) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const {name, reference_no} = parsedBody;
  
  try{
    const category = await Categories.findOne({where: { reference_no } })
    category.name = name

    await category.save()
  
    res.status(200).json({
      response_message:"Category edited successfully",
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

router.patch('/:id', (req, res) => {
  res.status(204).end(); // 204 No Content for successful updates
});

router.delete('/:id', (req, res) => {
  res.status(204).end(); // 204 No Content for successful deletions
});

module.exports = router;
