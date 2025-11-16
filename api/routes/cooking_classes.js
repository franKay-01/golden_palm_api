const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { CookingClass } = require('../../models');
const { authenticateAdmin } = require("../../middleware/authenticate");

// Configure multer for cooking class image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/cooking_classes');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cooking-class-' + uniqueSuffix + path.extname(file.originalname));
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

// Get all cooking classes
router.get('/', async (req, res, next) => {
  try {
    const classes = await CookingClass.findAll({
      order: [['date', 'DESC']]
    });

    return res.status(200).json({
      response_code: '000',
      response_message: 'Cooking classes retrieved successfully',
      classes
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    });
  }
});

// Get upcoming cooking class
router.get('/upcoming', async (req, res, next) => {
  try {
    const upcomingClass = await CookingClass.findOne({
      where: { is_upcoming: true },
      order: [['date', 'ASC']]
    });

    return res.status(200).json({
      response_code: '000',
      response_message: 'Upcoming class retrieved successfully',
      class: upcomingClass
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    });
  }
});

// Get previous cooking classes
router.get('/previous', async (req, res, next) => {
  try {
    const previousClasses = await CookingClass.findAll({
      where: { is_upcoming: false },
      order: [['date', 'DESC']]
    });

    return res.status(200).json({
      response_code: '000',
      response_message: 'Previous classes retrieved successfully',
      classes: previousClasses
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    });
  }
});

// Create new cooking class
router.post('/', authenticateAdmin, 
  uploadMultiple.fields([{ name: 'image', maxCount: 1 },{ name: 'class_images', maxCount: 10 }]), 
  async (req, res, next) => {
  try {
    const { name, url, date, amount } = req.body;

    // Check if main image was uploaded
    if (!req.files || !req.files.image || req.files.image.length === 0) {
      return res.status(400).json({
        response_code: '001',
        response_message: "Class image is required"
      });
    }

    const imgUrl = `/uploads/cooking_classes/${req.files.image[0].filename}`;

    // Process class_images if provided
    let classImageUrls = [];
    if (req.files.class_images && req.files.class_images.length > 0) {
      classImageUrls = req.files.class_images.map(file => `/uploads/cooking_classes/${file.filename}`);
    }

    // Check total number of classes
    const totalClasses = await CookingClass.count();

    // If there are already 2 classes, delete the oldest one
    if (totalClasses >= 2) {
      const oldestClass = await CookingClass.findOne({
        order: [['date', 'ASC']]
      });

      if (oldestClass) {
        // Delete main image file if it exists
        if (oldestClass.image) {
          const imagePath = path.join(__dirname, '../../', oldestClass.image);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }

        // Delete all class images if they exist
        if (oldestClass.class_images && Array.isArray(oldestClass.class_images)) {
          for (const imgUrl of oldestClass.class_images) {
            const imgPath = path.join(__dirname, '../../', imgUrl);
            if (fs.existsSync(imgPath)) {
              fs.unlinkSync(imgPath);
            }
          }
        }

        await oldestClass.destroy();
      }
    }

    // Mark all existing upcoming classes as not upcoming
    await CookingClass.update(
      { is_upcoming: false },
      { where: { is_upcoming: true } }
    );

    // Create new cooking class
    const cookingClass = await CookingClass.create({
      name,
      url,
      image: imgUrl,
      date,
      amount,
      is_upcoming: true,
      class_images: classImageUrls
    });

    res.status(200).json({
      response_message: "Cooking class created successfully",
      response_code: '000',
      class: cookingClass
    });
  } catch (err) {
    console.log(err);
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    });
  }
});

// Update cooking class
router.patch('/:class_id', authenticateAdmin, upload.single('image'), async (req, res, next) => {
  const class_id = req.params.class_id;
  const { name, url, date, amount, is_upcoming } = req.body;

  try {
    const cookingClass = await CookingClass.findOne({ where: { class_id } });

    if (!cookingClass) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Cooking class not found"
      });
    }

    // Update fields if provided
    if (name) cookingClass.name = name;
    if (url) cookingClass.url = url;
    if (date) cookingClass.date = date;
    if (amount) cookingClass.amount = amount;
    if (is_upcoming !== undefined) {
      // If marking as upcoming, mark all others as not upcoming
      if (is_upcoming === 'true' || is_upcoming === true) {
        await CookingClass.update(
          { is_upcoming: false },
          { where: { is_upcoming: true } }
        );
        cookingClass.is_upcoming = true;
      } else {
        cookingClass.is_upcoming = false;
      }
    }

    // Handle image update
    if (req.file) {
      // Delete old image file if it exists
      if (cookingClass.image) {
        const oldImagePath = path.join(__dirname, '../../', cookingClass.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      cookingClass.image = `/uploads/cooking_classes/${req.file.filename}`;
    }

    await cookingClass.save();

    res.status(200).json({
      response_message: "Cooking class updated successfully",
      response_code: '000',
      class: cookingClass
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    });
  }
});

// Delete cooking class
router.delete('/:class_id', authenticateAdmin, async (req, res, next) => {
  const class_id = req.params.class_id;

  try {
    const cookingClass = await CookingClass.findOne({ where: { class_id } });

    if (!cookingClass) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Cooking class not found"
      });
    }

    // Delete main image file if it exists
    if (cookingClass.image) {
      const imagePath = path.join(__dirname, '../../', cookingClass.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete all class images if they exist
    if (cookingClass.class_images && Array.isArray(cookingClass.class_images)) {
      for (const imgUrl of cookingClass.class_images) {
        const imgPath = path.join(__dirname, '../../', imgUrl);
        if (fs.existsSync(imgPath)) {
          fs.unlinkSync(imgPath);
        }
      }
    }

    await cookingClass.destroy();

    res.status(200).json({
      response_message: "Cooking class deleted successfully",
      response_code: '000'
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    });
  }
});

// Upload class images (for existing cooking class)
router.post('/:class_id/images', authenticateAdmin, uploadMultiple.array('class_images', 10), async (req, res, next) => {
  const class_id = req.params.class_id;

  try {
    const cookingClass = await CookingClass.findOne({ where: { class_id } });

    if (!cookingClass) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Cooking class not found"
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        response_code: '001',
        response_message: "At least one image is required"
      });
    }

    // Get existing images or initialize empty array
    const existingImages = cookingClass.class_images || [];

    // Add new image URLs
    const newImageUrls = req.files.map(file => `/uploads/cooking_classes/${file.filename}`);
    const updatedImages = [...existingImages, ...newImageUrls];

    cookingClass.class_images = updatedImages;
    await cookingClass.save();

    res.status(200).json({
      response_message: "Class images uploaded successfully",
      response_code: '000',
      class_images: updatedImages
    });
  } catch (err) {
    console.log(err);
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    });
  }
});

// Delete specific class image
router.delete('/:class_id/images', authenticateAdmin, async (req, res, next) => {
  const class_id = req.params.class_id;
  const { image_url } = req.body;

  try {
    const cookingClass = await CookingClass.findOne({ where: { class_id } });

    if (!cookingClass) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Cooking class not found"
      });
    }

    if (!image_url) {
      return res.status(400).json({
        response_code: '001',
        response_message: "Image URL is required"
      });
    }

    const currentImages = cookingClass.class_images || [];

    if (!currentImages.includes(image_url)) {
      return res.status(404).json({
        response_code: '001',
        response_message: "Image not found in class images"
      });
    }

    // Delete file from filesystem
    const imagePath = path.join(__dirname, '../../', image_url);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Remove from array
    const updatedImages = currentImages.filter(url => url !== image_url);
    cookingClass.class_images = updatedImages;
    await cookingClass.save();

    res.status(200).json({
      response_message: "Class image deleted successfully",
      response_code: '000',
      class_images: updatedImages
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    });
  }
});

module.exports = router;
