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
          model: Orders,
          as: 'order',
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
router.get('/order/:order_id', async (req, res) => {
  const order_id = req.params.order_id;

  try {
    const reviews = await Reviews.findAll({
      where: { order_id, is_active: true },
      include: [
        {
          model: Orders,
          as: 'order',
          attributes: ['reference_no', 'order_custom_id']
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

// Create a new review
router.post('/', async (req, res) => {
  const jwt = require('jsonwebtoken');

  try {
    const {order_id, item_type, rating, comment, token} = req.body;

    // Verify token if provided
    if (!token) {
      return res.status(400).json({
        response_code: '001',
        response_message: "Review token is required"
      });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        response_code: '001',
        response_message: "Invalid or expired review token"
      });
    }

    // Verify token purpose and order match
    if (decodedToken.purpose !== 'review') {
      return res.status(401).json({
        response_code: '001',
        response_message: "Invalid token purpose"
      });
    }

    if (decodedToken.order_reference_no !== order_id) {
      return res.status(401).json({
        response_code: '001',
        response_message: "Token does not match order"
      });
    }

    // Check if order exists
    const order = await Orders.findOne({ where: { reference_no: order_id } });
    if (!order) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Order not found"
      });
    }

    // Check if user already reviewed this order with this item type
    const existingReview = await Reviews.findOne({
      where: { order_id, user_email: decodedToken.email, item_type }
    });

    if (existingReview) {
      return res.status(200).json({
        response_code: '002',
        response_message: "You have already submitted a review for this order"
      });
    }

    const review = await Reviews.create({
      order_id,
      user_email: decodedToken.email,
      item_type,
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
