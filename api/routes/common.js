const express = require('express');
const router = express.Router();
const { Users, Orders, Products, Categories } = require('../../models');
const authenticateJWT = require('../../middleware/authenticate')

router.get('/product-info', async (req, res, next) => {
  try{
    const allCategories = await Categories.findAll({
      order: [['createdAt', 'DESC']] 
    });

    const allProducts = await Products.findAll({
      include: ['categories']
    });

    return res.json({
      response_code: '000',
      allCategories,
      allProducts
    })
  }catch(err){
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.get('/home-analytics', async (req, res, next) => {
  try{
    const users = Users.count();
    const orders = Orders.count();
    const products = Products.count();
    
    const [userCount, orderCount, productCount] = await Promise.all([users, orders, products]);

    const latestUsers = await Users.findAll({
      limit: 20,
      order: [['createdAt', 'DESC']] // Order users by the 'createdAt' column in descending order
    });

    const latestOrders = await Orders.findAll({
      limit: 20,
      order: [['createdAt', 'DESC']] // Order orders by the 'createdAt' column in descending order
    });

    return res.json({
      response_code: '000',
      userCount,
      orderCount,
      productCount,
      latestUsers,
      latestOrders
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

module.exports = router;