const express = require('express');
const router = express.Router();
const { Roles } = require('../../models');

// Error handling middleware
const errorHandler = (err, res) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: { message: err.message } });
};

router.use(express.json());

router.get('/', async (req, res) => {
  try {
    const roles = await Roles.findAll();
    res.json({ roles });
  } catch (err) {
    errorHandler(err, res);
  }
});

router.post('/', async (req, res) => {
  const { role_name } = req.body;
  try {
    const role = await Roles.create({ role_name });
    res.status(201).json({
      message: 'Role created',
      role
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

router.get('/:reference_no', async (req, res) => {
  const reference_no = req.params.reference_no;
  try {
    const role = await Roles.findOne({
      where: { reference_no }
    });

    if (!role) {
      res.status(404).json({ message: 'Role not found' });
    } else {
      res.json({ role });
    }
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
