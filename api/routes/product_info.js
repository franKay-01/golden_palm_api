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
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB per file
    files: 1 // 1 file for single upload
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

// Support multiple file uploads for variations
const uploadMultiple = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB per file
    files: 15, // Max 15 files (variations + additional images)
    fieldSize: 150 * 1024 * 1024 // 150MB total request size
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
    const {name, description, price, category_ref_no, slug, highlights, uses, metadata, is_discount, ref_color, is_hot, weight, weight_type, shipping_weight, shipping_weight_type, has_variations, variation_data, ingredients} = req.body;

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

    // Handle ingredients - support both JSON and comma-separated string
    let parsedIngredients = null;
    if (ingredients) {
      if (typeof ingredients === 'string') {
        try {
          // Try parsing as JSON first
          parsedIngredients = JSON.parse(ingredients);
        } catch (e) {
          // If JSON parse fails, treat as comma-separated string
          parsedIngredients = ingredients.split(',').map(item => item.trim()).filter(item => item.length > 0);
        }
      } else {
        parsedIngredients = ingredients;
      }
    }

    const hasVariations = has_variations === 'true' || has_variations === true;

    let mainImgUrl;
    let variations = null;
    let additionalImages = [];

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

      // Get additional images (files that aren't variation images)
      // const variationFiles = req.files.filter(f => f.fieldname.startsWith('variation_'));
      const additionalFiles = req.files.filter(f => f.fieldname === 'additional_images');
      additionalImages = additionalFiles.map(file => `/uploads/products/${file.filename}`);
    } else {
      // Single image product - first file is main image
      mainImgUrl = `/uploads/products/${req.files[0].filename}`;

      // Rest are additional images
      const additionalFiles = req.files.slice(1);
      additionalImages = additionalFiles.map(file => `/uploads/products/${file.filename}`);
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
      weight_type: weight_type || 'oz',
      shipping_weight: shipping_weight ? parseFloat(shipping_weight) : null,
      shipping_weight_type: shipping_weight_type || 'oz',
      has_variations: hasVariations,
      variations: variations,
      additional_images: additionalImages.length > 0 ? additionalImages : null,
      ingredients: parsedIngredients
    })

    res.status(200).json({
      response_message:"product successfully created",
      response_code: '000',
      product_ref_no: productInfo.sku,
      img_url: mainImgUrl,
      variations: variations,
      additional_images: additionalImages,
      ingredients: parsedIngredients
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

router.post('/:sku', authenticateAdmin, uploadMultiple.any(), async (req, res, next) => {
  const sku = req.params.sku;
  const {name, description, price, category_ref_no, slug, ref_color, is_hot, highlights, uses, weight, weight_type, shipping_weight, shipping_weight_type, ingredients, keep_existing_additional_images} = req.body;

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
    if (weight_type) product.weight_type = weight_type;
    if (shipping_weight !== undefined) product.shipping_weight = shipping_weight ? parseFloat(shipping_weight) : null;
    if (shipping_weight_type) product.shipping_weight_type = shipping_weight_type;

    // Handle main image update
    const mainImageFile = req.files?.find(f => f.fieldname === 'img_url');
    if (mainImageFile) {
      // Delete old image file if it exists
      if (product.img_url) {
        const oldImagePath = path.join(__dirname, '../../', product.img_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      product.img_url = `/uploads/products/${mainImageFile.filename}`;
    }

    // Handle additional images update
    const additionalImageFiles = req.files?.filter(f => f.fieldname === 'additional_images') || [];
    if (additionalImageFiles.length > 0) {
      const newAdditionalImages = additionalImageFiles.map(file => `/uploads/products/${file.filename}`);

      // If keep_existing_additional_images is true, append to existing images
      if (keep_existing_additional_images === 'true' && product.additional_images) {
        product.additional_images = [...product.additional_images, ...newAdditionalImages];
      } else {
        // Replace existing additional images
        if (product.additional_images && product.additional_images.length > 0) {
          // Delete old additional image files
          product.additional_images.forEach(imgUrl => {
            const oldImagePath = path.join(__dirname, '../../', imgUrl);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
          });
        }
        product.additional_images = newAdditionalImages;
      }
    }

    // Parse and update JSON fields if provided
    if (highlights) {
      product.highlights = highlights;
    }
    if (uses) {
      product.uses = typeof uses === 'string' ? JSON.parse(uses) : uses;
    }
    if (ingredients) {
      // Handle ingredients - support both JSON and comma-separated string
      if (typeof ingredients === 'string') {
        try {
          // Try parsing as JSON first
          product.ingredients = JSON.parse(ingredients);
        } catch (e) {
          // If JSON parse fails, treat as comma-separated string
          product.ingredients = ingredients.split(',').map(item => item.trim()).filter(item => item.length > 0);
        }
      } else {
        product.ingredients = ingredients;
      }
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

router.delete('/:sku/additional-image', authenticateAdmin, async (req, res, next) => {
  const sku = req.params.sku;
  const { image_url } = req.body;

  try {
    const product = await Products.findOne({where: { sku } });

    if (!product) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Product not found"
      });
    }

    if (!product.additional_images || product.additional_images.length === 0) {
      return res.status(400).json({
        response_code: '002',
        response_message: "Product has no additional images"
      });
    }

    // Find the image in the array
    const imageIndex = product.additional_images.indexOf(image_url);

    if (imageIndex === -1) {
      return res.status(404).json({
        response_code: '003',
        response_message: "Image not found in product's additional images"
      });
    }

    // Delete the physical file
    const imagePath = path.join(__dirname, '../../', image_url);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Remove from array
    product.additional_images.splice(imageIndex, 1);

    // If array is now empty, set to null
    if (product.additional_images.length === 0) {
      product.additional_images = null;
    }

    await product.save();

    res.status(200).json({
      response_message: "Additional image deleted successfully",
      response_code: '000',
      remaining_images: product.additional_images
    });
  } catch(err) {
    console.error('Error deleting additional image:', err);
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    });
  }
});

module.exports = router;