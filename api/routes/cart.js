const express = require('express');
const router = express.Router();
const {Carts, Products, CuratedBundles, Categories} = require('../../models');
const { authenticateJWT, authenticateAdmin } = require("../../middleware/authenticate");

const errorHandler = (err, res) => {
  console.error('Error occurred:', err);
  const status = err.status || 500;
  res.status(status).json({ error: { message: err.message } });
};

// Helper function to validate UUID format
const isValidUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof str === 'string' && uuidRegex.test(str);
};

// Helper function to calculate cart totals
const calculateTotals = (cartData) => {
  let total_amount = 0;
  let item_count = 0;

  cartData.forEach(item => {
    total_amount += parseFloat(item.unit_price) * item.quantity;
    item_count += item.quantity;
  });

  return {
    total_amount: parseFloat(total_amount.toFixed(2)),
    item_count
  };
};

// Get or create cart by session_id
router.post('/session', async (req, res) => {
  try {
    const {session_id, user_id} = req.body;

    if (!session_id) {
      return res.status(400).json({
        response_code: '001',
        response_message: "Session ID is required"
      });
    }

    // Try to find existing cart
    let cart = await Carts.findOne({
      where: { session_id }
    });

    // Create new cart if doesn't exist
    if (!cart) {
      cart = await Carts.create({
        session_id,
        user_id: user_id || null,
        cart_data: [],
        total_amount: 0.00,
        item_count: 0,
        expires_at: null
      });
    } else if (user_id && !cart.user_id) {
      // Associate user with existing cart if not already associated
      cart.user_id = user_id;
      await cart.save();
    }

    res.json({
      response_code: '000',
      cart,
      response_message: "Cart retrieved successfully"
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Get cart by session_id
router.get('/session/:session_id', async (req, res) => {
  const session_id = req.params.session_id;

  try {
    const cart = await Carts.findOne({
      where: { session_id }
    });

    if (!cart) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Cart not found"
      });
    }

    res.json({
      response_code: '000',
      cart,
      response_message: "Cart retrieved successfully"
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Get cart items with full product details
router.get('/items/:session_id', async (req, res) => {
  const session_id = req.params.session_id;

  try {
    const cart = await Carts.findOne({
      where: { session_id }
    });

    if (!cart) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Cart not found"
      });
    }

    const cartData = cart.cart_data || [];

    // Fetch full details for each item
    const detailedItems = await Promise.all(cartData.map(async (item) => {
      let productDetails = null;

      if (item.product_type === 'product') {
        productDetails = await Products.findOne({
          where: { sku: item.product_sku },
          include: [
            {
              model: Categories,
              as: 'categories'
            }
          ]
        });
      } else if (item.product_type === 'bundle') {
        productDetails = await CuratedBundles.findOne({
          where: { bundle_id: item.product_sku }
        });
      }

      return {
        id: item.product_sku,
        name: item.product_name,
        type: item.product_type,
        unit_price: item.unit_price,
        quantity: item.quantity,
        heat_level: item.heat_level,
        img_url: item.img_url,
        total_price: (parseFloat(item.unit_price) * item.quantity).toFixed(2),
        product_details: productDetails
      };
    }));

    res.json({
      response_code: '000',
      session_id: cart.session_id,
      cart_items: detailedItems,
      total_amount: cart.total_amount,
      item_count: cart.item_count,
      response_message: "Cart items retrieved successfully"
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Update entire cart (from frontend)
router.post('/sync', async (req, res) => {
  try {
    const {session_id, cart_items, user_id} = req.body;

    if (!session_id) {
      return res.status(400).json({
        response_code: '001',
        response_message: "Session ID is required"
      });
    }

    // Validate all product SKUs are valid UUIDs
    if (cart_items && cart_items.length > 0) {
      const invalidItems = cart_items.filter(item => !isValidUUID(item.id));
      if (invalidItems.length > 0) {
        return res.status(400).json({
          response_code: '001',
          response_message: "Invalid product SKU format. SKU must be a valid UUID",
          invalid_skus: invalidItems.map(item => item.id)
        });
      }
    }

    // Find or create cart
    let cart = await Carts.findOne({ where: { session_id } });

    if (!cart) {
      cart = await Carts.create({
        session_id,
        user_id: user_id || null,
        cart_data: [],
        total_amount: 0.00,
        item_count: 0,
        expires_at: null
      });
    }

    // Transform frontend cart_items to backend format
    const cartData = cart_items.map(item => ({
      product_sku: item.id,
      product_name: item.name,
      product_type: item.type,
      unit_price: item.unit_price,
      quantity: item.quantity,
      heat_level: item.heat_level || null,
      img_url: item.img_url || null
    }));

    // Calculate totals
    const totals = calculateTotals(cartData);

    // Update cart
    cart.cart_data = cartData;
    cart.total_amount = totals.total_amount;
    cart.item_count = totals.item_count;
    if (user_id && !cart.user_id) {
      cart.user_id = user_id;
    }
    await cart.save();

    res.json({
      response_code: '000',
      response_message: "Cart updated successfully",
      cart
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Add single item to cart
router.post('/items', async (req, res) => {
  try {
    const {session_id, id, name, unit_price, quantity, type, heat_level, img_url} = req.body;

    // Validate product SKU is a valid UUID
    if (!isValidUUID(id)) {
      return res.status(400).json({
        response_code: '001',
        response_message: "Invalid product SKU format. SKU must be a valid UUID",
        invalid_sku: id
      });
    }

    // Find or create cart
    let cart = await Carts.findOne({ where: { session_id } });

    if (!cart) {
      cart = await Carts.create({
        session_id,
        cart_data: [],
        total_amount: 0.00,
        item_count: 0,
        expires_at: null
      });
    }

    // Get current cart data
    let cartData = cart.cart_data || [];

    // Check if item already exists in cart
    const existingItemIndex = cartData.findIndex(item =>
      item.product_sku === id &&
      item.product_type === type &&
      item.heat_level === (heat_level || null)
    );

    if (existingItemIndex !== -1) {
      // Update quantity if item exists
      cartData[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      cartData.push({
        product_sku: id,
        product_name: name,
        product_type: type,
        unit_price,
        quantity,
        heat_level: heat_level || null,
        img_url: img_url || null
      });
    }

    // Calculate totals
    const totals = calculateTotals(cartData);

    // Update cart
    cart.cart_data = cartData;
    cart.total_amount = totals.total_amount;
    cart.item_count = totals.item_count;
    await cart.save();

    res.json({
      response_code: '000',
      response_message: existingItemIndex !== -1 ? "Cart item quantity updated" : "Item added to cart",
      cart
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Update cart item quantity
router.put('/items', async (req, res) => {
  try {
    const {session_id, id, type, heat_level, quantity} = req.body;

    // Validate product SKU is a valid UUID
    if (!isValidUUID(id)) {
      return res.status(400).json({
        response_code: '001',
        response_message: "Invalid product SKU format. SKU must be a valid UUID",
        invalid_sku: id
      });
    }

    const cart = await Carts.findOne({ where: { session_id } });

    if (!cart) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Cart not found"
      });
    }

    let cartData = cart.cart_data || [];

    // Find item index
    const itemIndex = cartData.findIndex(item =>
      item.product_sku === id &&
      item.product_type === type &&
      item.heat_level === (heat_level || null)
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Cart item not found"
      });
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      cartData.splice(itemIndex, 1);
    } else {
      // Update quantity
      cartData[itemIndex].quantity = quantity;
    }

    // Calculate totals
    const totals = calculateTotals(cartData);

    // Update cart
    cart.cart_data = cartData;
    cart.total_amount = totals.total_amount;
    cart.item_count = totals.item_count;
    await cart.save();

    res.json({
      response_code: '000',
      response_message: quantity <= 0 ? "Item removed from cart" : "Cart item updated",
      cart
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Remove item from cart
router.delete('/items', async (req, res) => {
  try {
    const {session_id, id, type, heat_level} = req.body;

    const cart = await Carts.findOne({ where: { session_id } });

    if (!cart) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Cart not found"
      });
    }

    let cartData = cart.cart_data || [];

    // Find and remove item
    const itemIndex = cartData.findIndex(item =>
      item.product_sku === id &&
      item.product_type === type &&
      item.heat_level === (heat_level || null)
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Cart item not found"
      });
    }

    cartData.splice(itemIndex, 1);

    // Calculate totals
    const totals = calculateTotals(cartData);

    // Update cart
    cart.cart_data = cartData;
    cart.total_amount = totals.total_amount;
    cart.item_count = totals.item_count;
    await cart.save();

    res.json({
      response_code: '000',
      response_message: "Item removed from cart",
      cart
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Clear entire cart
router.delete('/session/:session_id', async (req, res) => {
  const session_id = req.params.session_id;

  try {
    const cart = await Carts.findOne({ where: { session_id } });

    if (!cart) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Cart not found"
      });
    }

    // Clear cart data
    cart.cart_data = [];
    cart.total_amount = 0.00;
    cart.item_count = 0;
    await cart.save();

    res.json({
      response_code: '000',
      response_message: "Cart cleared successfully",
      cart
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Merge guest cart with user cart (when user logs in)
router.post('/merge', authenticateJWT, async (req, res) => {
  try {
    const {guest_session_id, user_session_id, user_id} = req.body;

    // Find guest cart
    const guestCart = await Carts.findOne({
      where: { session_id: guest_session_id }
    });

    if (!guestCart || !guestCart.cart_data || guestCart.cart_data.length === 0) {
      return res.json({
        response_code: '000',
        response_message: "No guest cart to merge"
      });
    }

    // Validate all product SKUs in guest cart are valid UUIDs
    const invalidItems = guestCart.cart_data.filter(item => !isValidUUID(item.product_sku));
    if (invalidItems.length > 0) {
      return res.status(400).json({
        response_code: '001',
        response_message: "Guest cart contains invalid product SKUs. Please clear invalid items before merging.",
        invalid_skus: invalidItems.map(item => item.product_sku)
      });
    }

    // Find or create user cart
    let userCart = await Carts.findOne({
      where: { session_id: user_session_id }
    });

    if (!userCart) {
      userCart = await Carts.create({
        session_id: user_session_id,
        user_id,
        cart_data: [],
        total_amount: 0.00,
        item_count: 0,
        expires_at: null
      });
    }

    let userCartData = userCart.cart_data || [];
    const guestCartData = guestCart.cart_data || [];

    // Merge items
    guestCartData.forEach(guestItem => {
      const existingItemIndex = userCartData.findIndex(item =>
        item.product_sku === guestItem.product_sku &&
        item.product_type === guestItem.product_type &&
        item.heat_level === guestItem.heat_level
      );

      if (existingItemIndex !== -1) {
        // Update quantity if item exists
        userCartData[existingItemIndex].quantity += guestItem.quantity;
      } else {
        // Add new item
        userCartData.push(guestItem);
      }
    });

    // Calculate totals
    const totals = calculateTotals(userCartData);

    // Update user cart
    userCart.cart_data = userCartData;
    userCart.total_amount = totals.total_amount;
    userCart.item_count = totals.item_count;
    await userCart.save();

    // Delete guest cart
    await guestCart.destroy();

    res.json({
      response_code: '000',
      response_message: "Carts merged successfully",
      cart: userCart
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Get cart total
router.get('/total/:session_id', async (req, res) => {
  const session_id = req.params.session_id;

  try {
    const cart = await Carts.findOne({
      where: { session_id }
    });

    if (!cart) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Cart not found"
      });
    }

    res.json({
      response_code: '000',
      total_amount: cart.total_amount,
      item_count: cart.item_count,
      response_message: "Cart total retrieved"
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Admin: Get all cart items across all sessions with summary
router.get('/admin/all-items', authenticateAdmin, async (req, res) => {
  try {
    const allCarts = await Carts.findAll();

    if (!allCarts || allCarts.length === 0) {
      return res.json({
        response_code: '000',
        all_items: [],
        summary: [],
        total_carts: 0,
        response_message: "No carts found"
      });
    }

    // Collect all items from all carts
    const allItems = [];
    const productSummary = {};

    allCarts.forEach(cart => {
      const cartData = cart.cart_data || [];

      cartData.forEach(item => {
        // Create unique key for grouping (sku + type + heat_level)
        const itemKey = `${item.product_sku}_${item.product_type}_${item.heat_level || 'null'}`;

        // Add to summary
        if (!productSummary[itemKey]) {
          productSummary[itemKey] = {
            product_sku: item.product_sku,
            product_name: item.product_name,
            product_type: item.product_type,
            unit_price: item.unit_price,
            heat_level: item.heat_level || null,
            img_url: item.img_url || null,
            total_quantity: 0,
            cart_count: 0,
            carts_with_item: new Set()
          };
        }

        productSummary[itemKey].total_quantity += item.quantity;
        productSummary[itemKey].carts_with_item.add(cart.session_id);

        // Add individual item to all items list
        allItems.push({
          session_id: cart.session_id,
          user_id: cart.user_id,
          product_sku: item.product_sku,
          product_name: item.product_name,
          product_type: item.product_type,
          unit_price: item.unit_price,
          quantity: item.quantity,
          heat_level: item.heat_level || null,
          img_url: item.img_url || null
        });
      });
    });

    // Convert summary to array and add cart counts
    const summary = Object.values(productSummary).map(item => ({
      product_sku: item.product_sku,
      product_name: item.product_name,
      product_type: item.product_type,
      unit_price: item.unit_price,
      heat_level: item.heat_level,
      img_url: item.img_url,
      total_quantity: item.total_quantity,
      cart_count: item.carts_with_item.size
    }));

    // Fetch full product details for summary items
    const productSkus = [...new Set(summary.map(s => s.product_sku))];
    const products = await Products.findAll({
      where: { sku: productSkus },
      include: [
        {
          model: Categories,
          as: 'categories'
        }
      ]
    });

    const bundles = await CuratedBundles.findAll({
      where: { bundle_id: productSkus }
    });

    // Enhance summary with product details
    const enhancedSummary = summary.map(item => {
      let productDetails = null;

      if (item.product_type === 'product') {
        productDetails = products.find(p => p.sku === item.product_sku);
      } else if (item.product_type === 'bundle') {
        productDetails = bundles.find(b => b.bundle_id === item.product_sku);
      }

      return {
        ...item,
        product_details: productDetails
      };
    });

    res.json({
      response_code: '000',
      all_items: allItems,
      summary: enhancedSummary,
      total_carts: allCarts.length,
      total_items: allItems.length,
      unique_products: summary.length,
      response_message: "All cart items retrieved successfully"
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

module.exports = router;
