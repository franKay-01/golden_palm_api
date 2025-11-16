const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const {Blogs} = require('../../models');
const { authenticateAdmin } = require('../../middleware/authenticate');

// Configure multer for blog image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/blogs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'blog-' + uniqueSuffix + path.extname(file.originalname));
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

router.get('/', async (req, res, next) => {
  try{
    const blogs = await Blogs.findAll({
      where: {
        is_active: true,
      },
      order: [['published_at', 'DESC']]
    });

    return res.status(200).json({
      response_code: '000',
      blogs
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

router.get('/all', async (req, res, next) => {
  try{
    const blogs = await Blogs.findAll({
      where: { is_active: true },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      response_code: '000',
      blogs
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

router.get('/category/:category', async (req, res, next) => {
  const category = req.params.category;
  try{
    const blogs = await Blogs.findAll({
      where: {
        is_active: true,
        is_published: true,
        category: category
      },
      order: [['published_at', 'DESC']]
    });

    return res.status(200).json({
      response_code: '000',
      category: category,
      blogs
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
    const {title, content, author, category, tags, slug, meta_description} = req.body;

    console.log('Body:', req.body);

    // Check if file was uploaded
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({
        response_code: '001',
        response_message: "Blog image is required"
      });
    }

    const imgUrl = `/uploads/blogs/${req.file.filename}`;

    const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : null;

    const blogInfo = await Blogs.create({
      title,
      content,
      author,
      category,
      tags: parsedTags,
      img_url: imgUrl,
      slug,
      meta_description: meta_description || ''
    })

    res.status(200).json({
      response_message:"blog successfully created",
      response_code: '000',
      blog_ref_no: blogInfo.blog_id,
      img_url: imgUrl
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
    const single_blog = await Blogs.findOne({
      where: { blog_id: referenceNo }
    })

    return res.json({
      response_message:"blog successfully retrieved",
      response_code: '000',
      blog: single_blog
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

router.get('/slug/:slug', async (req, res, next) => {
  const slug = req.params.slug;
  try{
    const single_blog = await Blogs.findOne({
      where: {
        slug: slug,
        is_active: true,
        is_published: true
      }
    })

    if (!single_blog) {
      return res.status(404).json({
        response_message:"blog not found",
        response_code: '404'
      })
    }

    return res.json({
      response_message:"blog successfully retrieved",
      response_code: '000',
      blog: single_blog
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

router.post('/publish/:blog_id', async (req, res, next) => {
  const blog_id = req.params.blog_id;

  try{
    const blog = await Blogs.findOne({where: { blog_id } })

    if (!blog) {
      return res.status(404).json({
        response_message:"blog not found",
        response_code: '404'
      })
    }

    blog.is_published = true
    blog.published_at = new Date()
    await blog.save()

    res.status(200).json({
      response_message:"blog published successfully",
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

router.post('/unpublish/:blog_id', async (req, res, next) => {
  const blog_id = req.params.blog_id;

  try{
    const blog = await Blogs.findOne({where: { blog_id } })

    if (!blog) {
      return res.status(404).json({
        response_message:"blog not found",
        response_code: '404'
      })
    }

    blog.is_published = false
    blog.published_at = null
    await blog.save()

    res.status(200).json({
      response_message:"blog unpublished successfully",
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

router.post('/:blog_id', authenticateAdmin, upload.single('img_url'), async (req, res, next) => {
  const blog_id = req.params.blog_id;
  const {title, content, author, category, tags, slug, meta_description} = req.body;

  try{
    const blog = await Blogs.findOne({where: { blog_id } })

    if (!blog) {
      return res.status(404).json({
        response_message:"blog not found",
        response_code: '404'
      })
    }

    // Update fields if provided
    if (title) blog.title = title;
    if (content) blog.content = content;
    if (author) blog.author = author;
    if (category) blog.category = category;
    if (slug) blog.slug = slug;
    if (meta_description) blog.meta_description = meta_description;

    // Handle image update
    if (req.file) {
      // Delete old image file if it exists
      if (blog.img_url) {
        const oldImagePath = path.join(__dirname, '../../', blog.img_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      blog.img_url = `/uploads/blogs/${req.file.filename}`;
    }

    // Parse and update tags if provided
    if (tags) {
      blog.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    await blog.save()

    res.status(200).json({
      response_message:"Blog updated successfully",
      response_code: '000',
      blog
    })
  }catch(err){
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.post('/remove/:blog_id', async (req, res, next) => {
  const blog_id = req.params.blog_id;

  try {
    const blog = await Blogs.findOne({where: { blog_id } })

    if (!blog) {
      return res.status(404).json({
        response_message:"blog not found",
        response_code: '404'
      })
    }

    blog.is_active = false;
    await blog.save()

    res.status(200).json({
      response_message:"Blog deactivated successfully",
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

router.post('/add/:blog_id', async (req, res, next) => {
  const blog_id = req.params.blog_id;

  try {
    const blog = await Blogs.findOne({where: { blog_id } })

    if (!blog) {
      return res.status(404).json({
        response_message:"blog not found",
        response_code: '404'
      })
    }

    blog.is_active = true;
    await blog.save()

    res.status(200).json({
      response_message:"Blog activated successfully",
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