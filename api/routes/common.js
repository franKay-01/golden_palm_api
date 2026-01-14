const express = require('express');
const schedule = require('node-schedule');
const Sequelize = require('sequelize');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { authenticateJWT, authenticateAdmin } = require("../../middleware/authenticate");
const { Users, Orders, Products, Categories,
  ShippingItemPrice, SubscriptionEmails,
  PasswordToken, ClientContact, Recipes, CuratedBundles, sequelize } = require('../../models');

const { sendSalesEmail, sendTokenEmail } = require('../../utils');

const router = express.Router();

// Configure multer for recipe image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/recipes');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recipe-' + uniqueSuffix + path.extname(file.originalname));
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

const errorHandler = (err, res) => {
  console.error('Error occurred:', err);
  const status = err.status || 500;
  res.status(status).json({ error: { message: err.message } });
};

const performDailyTask = async () => {
  try {
    await PasswordToken.update(
      { token_count: 0 }, // Set token_count to 0
      {
        where: {
          token_count: {
            [Sequelize.Op.gt]: 0, // Greater than 0
          }
        },
        returning: true, // Return the updated records
      }
    );

  } catch (error) {
    console.error('Error executing PostgreSQL query:', error);
  }
}

schedule.scheduleJob('0 0 * * *', performDailyTask);

const generateRandomString = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }

  return randomString;
}

router.get('/recipe', async (req, res) => {
  try {
    const recipe = await Recipes.findOne({ where: {is_active: true }})

    res.json({
      response_code: '000',
      recipe
    });
  } catch (err) {
    errorHandler(err, res);
  }
})

router.get('/recipes', async (req, res) => {
  try {
    const allRecipes = await Recipes.findAll({
        order: [['createdAt', 'DESC']]
      })

    if (allRecipes.length === 0) {
      res.status(201).json({ response_code: '001', error: { message: 'No categories found' } });
    } else {
      res.json({ response_code: '000', allRecipes, response_message: "Recipes retrieved successfully" });
    }

  } catch (err) {
    errorHandler(err, res);
  }
})

router.get('/recipe/:id', async (req, res) => {
  const recipeId = req.params.id;

  try {
    const recipe = await Recipes.findOne({
      where: {id: recipeId}
    })

    if (!recipe) {
      return res.status(404).json({
        response_code: '001',
        error: { message: 'Recipe not found' }
      });
    }

    // Fetch associated products if they exist
    console.log("recipe ", JSON.stringify(recipe))
    let products = [];
    if (recipe.associated_products && recipe.associated_products.length > 0) {
      products = await Products.findAll({
        where: {
          sku: recipe.associated_products
        },
        include: [
          {
            model: Categories,
            as: 'categories'
          }
        ]
      });
    }

    res.json({
      response_code: '000',
      recipe,
      products,
      response_message: "Recipe retrieved successfully"
    });

  } catch (err) {
    errorHandler(err, res);
  }
})

router.post('/recipe/:id', authenticateAdmin, async (req, res) => {
  const recipeId = req.params.id;

  try{
    const activeRecipe = await Recipes.findOne({
      where: {is_active: true}
    })

    if (activeRecipe){
      activeRecipe.is_active = false

      await activeRecipe.save()

      const newActiveRecipe = await Recipes.findOne({where: {id: recipeId}})

      if (newActiveRecipe){
        newActiveRecipe.is_active = true;
        await newActiveRecipe.save()

        res.status(200).json({
          response_code: '000',
          response_message: 'Active recipe selected'
        });
      }else{
        res.status(200).json({
          response_code: '001',
          response_message: 'Active recipe updated failed'
        });
      }
    }else{
      const newActiveRecipe = await Recipes.findOne({
        where: {id: recipeId}
      })

      if (newActiveRecipe){
        newActiveRecipe.is_active = true;
        await newActiveRecipe.save()

        res.status(200).json({
          response_code: '000',
          response_message: 'Active recipe selected'
        });
      }else{
        res.status(200).json({
          response_code: '001',
          response_message: 'Active recipe updated failed'
        });
      }
    }
  }catch (err) {
    errorHandler(err, res);
  }
})

router.put('/recipe/:id', authenticateAdmin, upload.single('associated_image'), async (req, res) => {
  const recipeId = req.params.id;

  try{
    console.log('Recipe update request received');
    console.log('Recipe ID:', recipeId);
    console.log('Body:', req.body);
    console.log('File:', req.file);

    const recipe = await Recipes.findOne({where: {id: recipeId}});

    if (!recipe) {
      return res.status(404).json({
        response_code: "001",
        response_message: "Recipe not found"
      });
    }

    const {title, description, prep_info, preparation, ingredients, associated_products} = req.body;

    // Update fields if provided
    if (title) recipe.title = title;
    if (description) recipe.description = description;

    // Handle image update
    if (req.file) {
      // Delete old image file if it exists
      if (recipe.associated_image) {
        const oldImagePath = path.join(__dirname, '../../', recipe.associated_image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      recipe.associated_image = `/uploads/recipes/${req.file.filename}`;
    }

    // Parse and update JSON fields if provided
    if (prep_info) {
      recipe.prep_info = typeof prep_info === 'string' ? JSON.parse(prep_info) : prep_info;
    }
    if (preparation) {
      recipe.preparation = typeof preparation === 'string' ? JSON.parse(preparation) : preparation;
    }
    if (ingredients) {
      recipe.ingredients = typeof ingredients === 'string' ? JSON.parse(ingredients) : ingredients;
    }
    if (associated_products) {
      recipe.associated_products = typeof associated_products === 'string' ? JSON.parse(associated_products) : associated_products;
    }

    await recipe.save();

    res.json({
      response_code: "000",
      response_message: "Recipe updated successfully",
      recipe
    });

  }catch(err){
    errorHandler(err, res);
  }
})

router.post('/recipe', authenticateAdmin, upload.single('associated_image'), async (req, res) => {
  try{
    console.log('Recipe creation request received');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('File:', req.file);
    console.log('Files:', req.files);

    const {title, description, prep_info, preparation, ingredients, associated_products} = req.body;

    // Check if file was uploaded
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({
        response_code: "001",
        response_message: "Image file is required"
      });
    }

    // Generate the image path/URL
    const imagePath = `/uploads/recipes/${req.file.filename}`;

    // Parse JSON fields if they're sent as strings
    const parsedPrepInfo = typeof prep_info === 'string' ? JSON.parse(prep_info) : prep_info;
    const parsedPreparation = typeof preparation === 'string' ? JSON.parse(preparation) : preparation;
    const parsedIngredients = typeof ingredients === 'string' ? JSON.parse(ingredients) : ingredients;
    const parsedAssociatedProducts = associated_products ? (typeof associated_products === 'string' ? JSON.parse(associated_products) : associated_products) : null;

    const recipe_details = await Recipes.create({
      title,
      description,
      associated_image: imagePath,
      prep_info: parsedPrepInfo,
      preparation: parsedPreparation,
      ingredients: parsedIngredients,
      associated_products: parsedAssociatedProducts
    })

    if (recipe_details){
      res.json({
        response_code: "000",
        response_message:"Recipe details created successfully",
        recipe_id: recipe_details.id,
        image_path: imagePath
      })
    }else{
      res.json({
        response_code: "001",
        response_message:"Recipe details creation failed"
      })
    }
  }catch(err){
    errorHandler(err, res);
  }
})

router.post('/contacts', async (req, res) => {
  const rawBody = req.body.toString();
  const {first_name, last_name, email, message} = JSON.parse(rawBody);

  try{
    const contact_details = await ClientContact.create({ first_name, last_name, email, message})

    if (contact_details){
      res.json({
        response_code: 200,
        response_message:"Contact details created successfully"
      })
    }else{
      res.json({
        response_code: 300,
        response_message:"Contact details creation failed"
      })
    }
  }catch(err){
    res.json({
      response_code: 300,
      response_message: err.message
    })
  }
  
})

router.post('/email-subscription', async (req, res) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  try{
    const email_sub = await SubscriptionEmails.create({email: parsedBody.email})

    if (email_sub){
      res.json({
        response_code: 200,
        response_message:"Email Subscription created successfully"
      })
    }else{
      res.json({
        response_code: 300,
        response_message:"Email Subscription creation failed"
      })
    }
  }catch(err){
    res.json({
      response_code: 300,
      response_message: err.message
    })
  }
  
})

router.post('/shipping-rates', authenticateJWT, async (req, res) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const rate_info = await ShippingItemPrice.create({price: parsedBody.price, percentage: parsedBody.percentage})

  if (rate_info){
    res.json({
      response_code: 200,
      response_message:"Shipping rate created successfully"
    })
  }else{
    res.json({
      response_code: 300,
      response_message:"Shipping rate creation failed"
    })
  }
})

router.post('/send-token', async (req, res) => {
  const rawBody = req.body.toString();
  const { username } = JSON.parse(rawBody);
 
  const check_user = await PasswordToken.findOne({
    where: { username } 
  })

  if (check_user){
    if (check_user.token_count >= 3){
      return res.status(200).json({ response_code: 204, response_message: "Attempts to change password for today have been exhausted. Please try again in 24Hrs"});
    }

    let timed_expired = new Date();
    timed_expired.setMinutes(timed_expired.getMinutes() + 20);
    let user_token = generateRandomString(6)

    check_user.timed_expired = timed_expired
    check_user.user_token = user_token
    check_user.token_count = check_user.token_count + 1

    await check_user.save()

    const {email} = await Users.findOne({where: {username}})
    if (email){
      await sendTokenEmail(email, user_token)
      return res.status(200).json({ response_code: 200, response_message: "Token has been sent to your email"});
    }

    return res.status(200).json({ response_code: 203, response_message: "Attempts to send token failed. Please try again later"});
  }else{
    try{
      let timed_expired = new Date();
      timed_expired.setMinutes(timed_expired.getMinutes() + 20);
      let user_token = generateRandomString(6)
      const pass_token = await PasswordToken.create({username, user_token, timed_expired, token_count: 0})
  
      if (pass_token) {
        const {email} = await Users.findOne({where: {username}})
        if (email){
          await sendTokenEmail(email, user_token)
          return res.status(200).json({ response_code: 200, response_message: "Token has been sent to your email"});
        }
        return res.status(200).json({ response_code: 203, response_message: "Attempts to send token failed. Please try again later"});
      }
  
      return res.status(200).json({ response_code: 203, response_message: "Attempts to send token failed. Please try again later"});
    }catch(err){
      return res.status(200).json({ response_code: 203, response_message: "Attempts to send token failed. Please try again later"});
    }
  }
})

router.post('/check-token', async (req, res) => {
  const rawBody = req.body.toString();
  const { username, user_token } = JSON.parse(rawBody);
  
  try{
    const pass_token = await PasswordToken.findOne({
      where: { username, user_token },
    })

    if (pass_token) {
      let now_date = new Date();
      if (pass_token.timed_expired > now_date) {
        return res.status(200).json({ response_code: 200});
      }
      return res.status(200).json({ response_code: 203});
    }
    return res.status(200).json({ response_code: 203});
  }catch(err){
    return res.status(200).json({ response_code: 204});
  }
})

router.get('/test-email', (req, res) => {
  const resp = sendSalesEmail('fkay0450@gmail.com', '72314504-6c99-4bb8-b302-109b1f419920')
  res.json({
    response_code: 200,
    response_message: resp
  })
})

router.get('/product-info', async (req, res, next) => {
  try {
    const [allCategories, allProducts] = await Promise.all([
      Categories.findAll({
        order: [['createdAt', 'DESC']]
      }),
      Products.findAll({
        include: [
          {
            model: Categories, // Reference the associated model class here
            as: 'categories'   // Alias used in the association
          }
        ],
        order: [
          [sequelize.cast(sequelize.col('price'), 'DECIMAL'), 'ASC']
        ]
      })
    ]);

    res.status(200).json({
      response_code: '000',
      allCategories,
      allProducts
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

router.get('/product-info/category/:categoryName', async (req, res, next) => {
  const categoryName = req.params.categoryName;

  try {
    // Find the category by name
    console.log("categoryName ", categoryName)
    const category = await Categories.findOne({
      where: { name: categoryName }
    });

    if (!category) {
      return res.status(404).json({
        response_code: '001',
        error: {
          message: 'Category not found'
        }
      });
    }

    // Find all products in this category
    const products = await Products.findAll({
      where: {
        category_ref_no: category.reference_no,
        is_active: true
      },
      include: [
        {
          model: Categories,
          as: 'categories'
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      response_code: '000',
      category,
      products
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

router.get('/home-analytics', authenticateJWT, async (req, res, next) => {
  try {
    const [userCount, orderCount, productCount, latestUsers, latestOrders] = await Promise.all([
      Users.count(),
      Orders.count(),
      Products.count(),
      Users.findAll({
        limit: 20,
        order: [['createdAt', 'DESC']]
      }),
      Orders.findAll({
        limit: 20,
        order: [['createdAt', 'DESC']]
      })
    ]);

    res.json({
      response_code: "000",
      response_message: "Data retrieved successfully",
      userCount,
      orderCount,
      productCount,
      latestUsers,
      latestOrders
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

router.get('/products-and-bundles', async (req, res, next) => {
  try {
    const [products, bundles] = await Promise.all([
      Products.findAll({
        where: { is_active: true },
        include: [
          {
            model: Categories,
            as: 'categories'
          }
        ],
        order: [
          [sequelize.cast(sequelize.col('price'), 'DECIMAL'), 'ASC']
        ]
      }),
      CuratedBundles.findAll({
        where: { is_active: true },
        order: [
          [sequelize.cast(sequelize.col('price'), 'DECIMAL'), 'ASC']
        ]
      })
    ]);

    // Fetch product details for each bundle
    for (const bundle of bundles) {
      if (bundle.products && Array.isArray(bundle.products) && bundle.products.length > 0) {
        const productDetails = await Products.findAll({
          where: {
            sku: bundle.products
          },
          include: [
            {
              model: Categories,
              as: 'categories'
            }
          ]
        });
        bundle.dataValues.product_details = productDetails;
      }
    }

    res.status(200).json({
      response_code: '000',
      response_message: 'Products and bundles retrieved successfully',
      products,
      bundles
    });
  } catch (err) {
    errorHandler(err, res);
  }
});

module.exports = router;
