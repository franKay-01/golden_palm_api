const express = require('express');
const router = express.Router();
const {Blogs} = require('../../models');

router.get('/', async (req, res, next) => {
  try{
    const blogs = await Blogs.findAll({
      where: {
        is_active: true,
        is_published: true
      },
      order: [['published_at', 'DESC']]
    });

    return res.status(200).json({
      response_code: 200,
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
      response_code: 200,
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
      response_code: 200,
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

router.post('/', async (req, res, next) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const {title, content, author, category, tags, img_url, slug, meta_description} = parsedBody;
  try{
    const blogInfo = await Blogs.create({
      title,
      content,
      author,
      category,
      tags,
      img_url,
      slug,
      meta_description
    })

    res.status(200).json({
      response_message:"blog successfully created",
      response_code: '000',
      blog_ref_no: blogInfo.blog_id
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

router.post('/:blog_id', async (req, res, next) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const {title, content, author, category, tags, img_url, slug, meta_description, blog_id} = parsedBody;

  try{
    const blog = await Blogs.findOne({where: { blog_id } })

    if (!blog) {
      return res.status(404).json({
        response_message:"blog not found",
        response_code: '404'
      })
    }

    blog.title = title
    blog.content = content
    blog.author = author
    blog.category = category
    blog.tags = tags
    blog.img_url = img_url
    blog.slug = slug
    blog.meta_description = meta_description

    await blog.save()

    res.status(200).json({
      response_message:"Blog updated successfully",
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