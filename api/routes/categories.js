const express = require('express');
const router = express.Router();
const { Categories } = require('../../models');
const authenticateJWT = require('../../middleware/authenticate');

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
      res.status(404).json({ error: { message: 'No categories found' } });
    } else {
      res.json({ categories });
    }
  } catch (err) {
    errorHandler(err, res);
  }
});

router.post('/', async (req, res) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);
  const { category_name } = parsedBody;
  try {
    await Categories.create({ name: category_name });
    res.status(201).json({
      response_message: "Category INFO",
      response_code: '000'
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

router.get('/:reference_no', async (req, res) => {
  const category_ref_no = req.params.reference_no;
  try {
    const category = await Categories.findOne({ where: { category_ref_no } });
    if (!category) {
      return res.status(404).json({ error: { message: 'Category not found' } });
    }
    res.json({ category });
  } catch (err) {
    errorHandler(err, res);
  }
});

router.patch('/:id', (req, res) => {
  res.status(204).end(); // 204 No Content for successful updates
});

router.delete('/:id', (req, res) => {
  res.status(204).end(); // 204 No Content for successful deletions
});

module.exports = router;
