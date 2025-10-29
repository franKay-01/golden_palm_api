const express = require('express');
const router = express.Router();
const {Reviews, Orders, Users, Products, CuratedBundles} = require('../../models');
const { authenticateJWT, authenticateAdmin } = require("../../middleware/authenticate");

const errorHandler = (err, res) => {
  console.error('Error occurred:', err);
  const status = err.status || 500;
  res.status(status).json({ error: { message: err.message } });
};

// Get all active reviews (public)
router.get('/', async (req, res) => {
  try {
    const reviews = await Reviews.findAll({
      where: { is_active: true },
      include: [
        {
          model: Users,
          as: 'user',
          attributes: ['first_name', 'last_name']
        },
        {
          model: Products,
          as: 'product',
          attributes: ['sku', 'name', 'img_url'],
          required: false
        },
        {
          model: CuratedBundles,
          as: 'bundle',
          attributes: ['bundle_id', 'name', 'img_url'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      response_code: '000',
      reviews,
      response_message: "Reviews retrieved successfully"
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Get reviews for a specific order
router.get('/order/:order_id', authenticateJWT, async (req, res) => {
  const order_id = req.params.order_id;

  try {
    const reviews = await Reviews.findAll({
      where: { order_id, is_active: true },
      include: [
        {
          model: Users,
          as: 'user',
          attributes: ['first_name', 'last_name']
        }
      ]
    });

    res.json({
      response_code: '000',
      reviews,
      response_message: "Order reviews retrieved successfully"
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Get reviews by a specific user
router.get('/user/:user_id', authenticateJWT, async (req, res) => {
  const user_id = req.params.user_id;

  try {
    const reviews = await Reviews.findAll({
      where: { user_id, is_active: true },
      include: [
        {
          model: Orders,
          as: 'order',
          attributes: ['reference_no', 'order_custom_id']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      response_code: '000',
      reviews,
      response_message: "User reviews retrieved successfully"
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Get reviews for a specific product
router.get('/product/:item_id', async (req, res) => {
  const item_id = req.params.item_id;

  try {
    const reviews = await Reviews.findAll({
      where: { item_id, item_type: 'product', is_active: true },
      include: [
        {
          model: Users,
          as: 'user',
          attributes: ['first_name', 'last_name']
        },
        {
          model: Products,
          as: 'product',
          attributes: ['sku', 'name', 'img_url']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      response_code: '000',
      reviews,
      response_message: "Product reviews retrieved successfully"
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Get reviews for a specific bundle
router.get('/bundle/:item_id', async (req, res) => {
  const item_id = req.params.item_id;

  try {
    const reviews = await Reviews.findAll({
      where: { item_id, item_type: 'bundle', is_active: true },
      include: [
        {
          model: Users,
          as: 'user',
          attributes: ['first_name', 'last_name']
        },
        {
          model: CuratedBundles,
          as: 'bundle',
          attributes: ['bundle_id', 'name', 'img_url']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      response_code: '000',
      reviews,
      response_message: "Bundle reviews retrieved successfully"
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Create a new review
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const {order_id, user_id, item_type, item_id, rating, comment} = req.body;

    // Check if order exists
    const order = await Orders.findOne({ where: { reference_no: order_id } });
    if (!order) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Order not found"
      });
    }

    // Verify that the item exists
    if (item_type === 'product') {
      const product = await Products.findOne({ where: { sku: item_id } });
      if (!product) {
        return res.status(404).json({
          response_code: '001',
          response_message: "Product not found"
        });
      }
    } else if (item_type === 'bundle') {
      const bundle = await CuratedBundles.findOne({ where: { bundle_id: item_id } });
      if (!bundle) {
        return res.status(404).json({
          response_code: '001',
          response_message: "Bundle not found"
        });
      }
    }

    // Check if user already reviewed this item in this order
    const existingReview = await Reviews.findOne({
      where: { order_id, user_id, item_id, item_type }
    });

    if (existingReview) {
      return res.status(400).json({
        response_code: '002',
        response_message: "You have already reviewed this item"
      });
    }

    const review = await Reviews.create({
      order_id,
      user_id,
      item_type,
      item_id,
      rating,
      comment
    });

    res.status(201).json({
      response_code: '000',
      response_message: "Review created successfully",
      review
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Update a review
router.put('/:id', authenticateJWT, async (req, res) => {
  const reviewId = req.params.id;

  try {
    const {rating, comment} = req.body;

    const review = await Reviews.findByPk(reviewId);

    if (!review) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Review not found"
      });
    }

    // Update fields if provided
    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();

    res.json({
      response_code: '000',
      response_message: "Review updated successfully",
      review
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Toggle review active status (admin only)
router.post('/status/:id', authenticateAdmin, async (req, res) => {
  const reviewId = req.params.id;

  try {
    const review = await Reviews.findByPk(reviewId);

    if (!review) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Review not found"
      });
    }

    review.is_active = !review.is_active;
    await review.save();

    res.json({
      response_code: '000',
      response_message: `Review ${review.is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Delete a review (soft delete by setting is_active to false)
router.delete('/:id', authenticateJWT, async (req, res) => {
  const reviewId = req.params.id;

  try {
    const review = await Reviews.findByPk(reviewId);

    if (!review) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Review not found"
      });
    }

    review.is_active = false;
    await review.save();

    res.json({
      response_code: '000',
      response_message: "Review deleted successfully"
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

module.exports = router;
