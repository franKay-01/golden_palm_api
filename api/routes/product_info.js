const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const {Categories, Products} = require('../../models');
const { authenticateJWT, authenticateAdmin} = require("../../middleware/authenticate");

// Configure multer for product image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/products');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
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

// Support multiple file uploads for variations
const uploadMultiple = multer({
  storage: storage,
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
    const products = await Products.findAll({
      where: { is_active: true },
      include: [
        {
          model: Categories, // Reference the associated model class here
          as: 'categories'   // Alias used in the association
        }
      ]
    });
    
    return res.status(200).json({
      response_code: '000',
      products
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

router.post('/', authenticateAdmin, uploadMultiple.any(), async (req, res, next) => {
  try{
    const {name, description, price, category_ref_no, slug, highlights, uses, metadata, is_discount, ref_color, is_hot, weight, has_variations, variation_data} = req.body;

    console.log('Body:', req.body);
    console.log('Files:', req.files);

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      console.error('No file uploaded');
      return res.status(400).json({
        response_code: '001',
        response_message: "Product image is required"
      });
    }

    const parsedUses = uses ? (typeof uses === 'string' ? JSON.parse(uses) : uses) : null;
    const parsedMetadata = metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : null;
    const hasVariations = has_variations === 'true' || has_variations === true;

    let mainImgUrl;
    let variations = null;

    if (hasVariations && variation_data) {
      // Parse variation data: [{heat_level: "mild"}, {heat_level: "med"}, {heat_level: "hot"}]
      const parsedVariationData = typeof variation_data === 'string' ? JSON.parse(variation_data) : variation_data;

      // Map uploaded files to variations based on fieldname or order
      variations = parsedVariationData.map((variation, index) => {
        const file = req.files.find(f => f.fieldname === `variation_${variation.heat_level}`) || req.files[index];
        return {
          heat_level: variation.heat_level,
          img_url: file ? `/uploads/products/${file.filename}` : null
        };
      });

      // Use first variation image as main image
      mainImgUrl = variations[0]?.img_url;
    } else {
      // Single image product
      mainImgUrl = `/uploads/products/${req.files[0].filename}`;
    }

    const productInfo = await Products.create({
      name,
      description,
      price,
      quantity: 0,
      category_ref_no,
      slug,
      img_url: mainImgUrl,
      highlights,
      uses: parsedUses,
      metadata: parsedMetadata,
      is_discount,
      ref_color,
      is_hot,
      weight: weight ? parseFloat(weight) : null,
      has_variations: hasVariations,
      variations: variations
    })

    res.status(200).json({
      response_message:"product successfully created",
      response_code: '000',
      product_ref_no: productInfo.sku,
      img_url: mainImgUrl,
      variations: variations
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

router.get('/slug/:slug', async (req, res, next) => {
  const slug = req.params.slug;
  try{
    const single_product = await Products.findOne({
      where: { slug },
      include: [
        {
          model: Categories,
          as: 'categories'
        }
      ]
    })

    if (!single_product) {
      return res.status(404).json({
        response_message:"Product not found",
        response_code: '001'
      });
    }

    return res.json({
      response_message:"product successfully retreived",
      response_code: '000',
      product: single_product
    })
  }catch(err){
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
    const single_product = await Products.findOne({
      where: { sku: referenceNo },
      include: [
        {
          model: Categories, // Reference the associated model class here
          as: 'categories'   // Alias used in the association
        }
      ]
    })

    if (!single_product) {
      return res.status(404).json({
        response_message:"Product not found",
        response_code: '001'
      });
    }

    return res.json({
      response_message:"product successfully retreived",
      response_code: '000',
      product: single_product
    })
  }catch(err){
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.post('/status', authenticateAdmin, async (req, res, next) => {
  const { sku } = req.body;

  try{
    const product = await Products.findOne({where: { sku } })

    product.is_active = !product.is_active
    await product.save()
  
    res.status(200).json({
      response_message:"product editted",
      response_code: '000'
    })
  }catch{
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.post('/:sku', authenticateAdmin, upload.single('img_url'), async (req, res, next) => {
  const sku = req.params.sku;
  const {name, description, price, category_ref_no, slug, ref_color, is_hot, highlights, uses, weight} = req.body;

  try{
    const product = await Products.findOne({where: { sku } })

    if (!product) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Product not found"
      });
    }

    // Update fields if provided
    if (name) product.name = name;
    if (ref_color) product.ref_color = ref_color;
    if (description) product.description = description;
    if (price) product.price = price;
    if (category_ref_no) product.category_ref_no = category_ref_no;
    if (slug) product.slug = slug;
    if (is_hot) product.is_hot = is_hot;
    if (weight !== undefined) product.weight = weight ? parseFloat(weight) : null;

    // Handle image update
    if (req.file) {
      // Delete old image file if it exists
      if (product.img_url) {
        const oldImagePath = path.join(__dirname, '../../', product.img_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      product.img_url = `/uploads/products/${req.file.filename}`;
    }

    // Parse and update JSON fields if provided
    if (highlights) {
      product.highlights = highlights;
    }
    if (uses) {
      product.uses = typeof uses === 'string' ? JSON.parse(uses) : uses;
    }

    await product.save()

    res.status(200).json({
      response_message:"Product edited successfully",
      response_code: '000',
      product
    })
  }catch(err){
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.post('/remove/:sku', authenticateAdmin, async (req, res, next) => {
  const sku = req.params.sku;

  try {
    const product = await Products.findOne({where: { sku } })
    product.is_active = false;
    await product.save()
  
    res.status(200).json({
      response_message:"Product edited successfully",
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

router.post('/add/:sku', authenticateAdmin, async (req, res, next) => {
  const sku = req.params.sku;

  try {
    const product = await Products.findOne({where: { sku } })
    product.is_active = true;
    await product.save()
  
    res.status(200).json({
      response_message:"Product edited successfully",
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