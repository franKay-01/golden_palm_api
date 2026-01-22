const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const {CuratedBundles, Products, sequelize} = require('../../models');
const { authenticateJWT, authenticateAdmin } = require("../../middleware/authenticate");

// Configure multer for bundle image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/bundles');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bundle-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

router.get('/', async (req, res, next) => {
  try{
    const bundles = await CuratedBundles.findAll({
      where: { is_active: true },
      order: [
        [sequelize.cast(sequelize.col('price'), 'DECIMAL'), 'ASC']
      ]
    });

    const bundlesWithProducts = await Promise.all(bundles.map(async (bundle) => {
      const bundleData = bundle.toJSON();

      if (bundleData.products && Array.isArray(bundleData.products)) {
        const productDetails = await Promise.all(bundleData.products.map(async (productId) => {
          try {
            const product = await Products.findOne({
              where: { sku: productId },
              attributes: ['sku', 'name', 'price', 'img_url', 'is_hot']
            });
            return product ? product.toJSON() : null;
          } catch (error) {
            console.error(`Error fetching product ${productId}:`, error);
            return null;
          }
        }));

        bundleData.product_details = productDetails.filter(product => product !== null);
      }

      return bundleData;
    }));

    return res.status(200).json({
      response_code: '000',
      bundles: bundlesWithProducts
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

router.get('/type/:bundle_type', async (req, res, next) => {
  const bundle_type = req.params.bundle_type;
  try{
    // If bundle_type is 'all', fetch all bundles, otherwise filter by type
    const whereCondition = bundle_type === 'all'
      ? { is_active: true }
      : { is_active: true, bundle_type: bundle_type };

    const bundles = await CuratedBundles.findAll({
      where: whereCondition,
      order: [
        [sequelize.cast(sequelize.col('price'), 'DECIMAL'), 'ASC']
      ]
    });

    const bundlesWithProducts = await Promise.all(bundles.map(async (bundle) => {
      const bundleData = bundle.toJSON();

      if (bundleData.products && Array.isArray(bundleData.products)) {
        const productDetails = await Promise.all(bundleData.products.map(async (productId) => {
          try {
            const product = await Products.findOne({
              where: { sku: productId },
              attributes: ['sku', 'name', 'price', 'img_url', 'is_hot']
            });
            return product ? product.toJSON() : null;
          } catch (error) {
            console.error(`Error fetching product ${productId}:`, error);
            return null;
          }
        }));

        bundleData.product_details = productDetails.filter(product => product !== null);
      }

      return bundleData;
    }));

    return res.status(200).json({
      response_code: '000',
      bundle_type: bundle_type,
      bundles: bundlesWithProducts
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

router.post('/', authenticateAdmin, upload.single('img_url'), async (req, res, next) => {
  try{
    const {name, description, price, discount_percentage, products, bundle_type} = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        response_code: '001',
        response_message: "Bundle image is required"
      });
    }

    const imgUrl = `/uploads/bundles/${req.file.filename}`;

    // Parse products if it's a string
    const parsedProducts = products ? (typeof products === 'string' ? JSON.parse(products) : products) : null;

    const bundleInfo = await CuratedBundles.create({
      name,
      description,
      price,
      discount_percentage,
      img_url: imgUrl,
      products: parsedProducts,
      bundle_type
    })

    res.status(200).json({
      response_message:"bundle successfully created",
      response_code: '000',
      bundle_ref_no: bundleInfo.bundle_id,
      img_url: imgUrl
    })
  }catch(err){
    console.log()
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.get('/:referenceNo', async (req, res, next) => {
  const referenceNo = req.params.referenceNo;
  try{
    const single_bundle = await CuratedBundles.findOne({
      where: { bundle_id: referenceNo }
    })

    return res.json({
      response_message:"bundle successfully retrieved",
      response_code: '000',
      bundle: single_bundle
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

router.post('/status', authenticateJWT, async (req, res, next) => {
  const {bundle_id} = req.body;

  try{
    const bundle = await CuratedBundles.findOne({where: { bundle_id } })

    bundle.is_active = !bundle.is_active
    await bundle.save()

    res.status(200).json({
      response_message:"bundle status updated",
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

router.post('/:bundle_id', authenticateJWT, upload.single('img_url'), async (req, res, next) => {
  const bundle_id = req.params.bundle_id;
  const {name, description, price, discount_percentage, products, bundle_type} = req.body;

  try{
    const bundle = await CuratedBundles.findOne({where: { bundle_id } })

    if (!bundle) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Bundle not found"
      });
    }

    // Update fields if provided
    if (name) bundle.name = name;
    if (description) bundle.description = description;
    if (price) bundle.price = price;
    if (discount_percentage) bundle.discount_percentage = discount_percentage;
    if (bundle_type) bundle.bundle_type = bundle_type;

    // Handle image update
    if (req.file) {
      // Delete old image file if it exists
      if (bundle.img_url) {
        const oldImagePath = path.join(__dirname, '../../', bundle.img_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      bundle.img_url = `/uploads/bundles/${req.file.filename}`;
    }

    // Parse and update products if provided
    if (products) {
      bundle.products = typeof products === 'string' ? JSON.parse(products) : products;
    }

    await bundle.save()

    res.status(200).json({
      response_message:"Bundle edited successfully",
      response_code: '000',
      bundle
    })
  }catch(err){
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.post('/remove/:bundle_id', authenticateJWT, async (req, res, next) => {
  const bundle_id = req.params.bundle_id;

  try {
    const bundle = await CuratedBundles.findOne({where: { bundle_id } })
    bundle.is_active = false;
    await bundle.save()

    res.status(200).json({
      response_message:"Bundle deactivated successfully",
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

router.post('/add/:bundle_id', authenticateJWT, async (req, res, next) => {
  const bundle_id = req.params.bundle_id;

  try {
    const bundle = await CuratedBundles.findOne({where: { bundle_id } })
    bundle.is_active = true;
    await bundle.save()

    res.status(200).json({
      response_message:"Bundle activated successfully",
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