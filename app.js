const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const requestIp = require('request-ip');
const geoip = require('geoip-lite');

const productInfoRoutes = require("./api/routes/product_info");
const userRoutes = require("./api/routes/users");
const categoryRoutes = require("./api/routes/categories")
const shippingRoutes = require("./api/routes/shipping_address")
const orderRoutes = require("./api/routes/order")
const stripe = require("./api/routes/stripe_transaction")
const common = require("./api/routes/common")
const curatedBundles = require('./api/routes/curated_bundles')
const reviews = require('./api/routes/reviews')
const cart = require('./api/routes/cart')

const cors = require('cors');

const allowedOrigins = ['http://localhost:4010', 'http://localhost:8020'];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow credentials
};

app.use(cors(corsOptions));
// Array of allowed country codes
const allowedCountries = ['US', 'CA', 'GH']; // Add more country codes as needed

// Middleware function to check if the country is allowed
const allowOnlyAllowedCountries = (req, res, next) => {
  const clientIp = requestIp.getClientIp(req);
  console.log("CLIENT IP " + JSON.stringify(clientIp))
  const geo = geoip.lookup(clientIp);
  const country = geo ? geo.country : 'Unknown';

  if (allowedCountries.includes(country)) {
    // Country is allowed, proceed to the next middleware or route handler
    next();
  } else {
    // Country is not allowed, deny access or redirect to an error page
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access denied. Your country is not allowed to access this site.\n');
  }
};

// app.use(allowOnlyAllowedCountries)

// app.use(cors({
//   origin: 'http://localhost:4010', // Allow only this origin
//   credentials: true, // Allow credentials
// }));

// app.use(cors({
//   origin: 'http://localhost:8020', // Allow only this origin
//   credentials: true, // Allow credentials
// }));

app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

// Skip body parsing for multipart/form-data (let multer handle it)
app.use((req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }
  next();
});

app.use(bodyParser.json()); // Middleware for reading request body
app.use(bodyParser.urlencoded({extended: true}));
// app.use(bodyParser.raw({type: "*/*"}))
app.use(bodyParser.json())
app.use('stripe/webhook', bodyParser.raw({type: "*/*"}))

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Header', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS'){
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
    return res.status(200).json({})
  }
  next();
})

app.use('/product-info', productInfoRoutes);
app.use('/users', userRoutes);
app.use('/categories', categoryRoutes);
app.use('/shipping', shippingRoutes)
app.use('/order', orderRoutes)
app.use('/stripe', stripe)
app.use('/common', common)
app.use('/curated-bundles', curatedBundles)
app.use('/reviews', reviews)
app.use('/cart', cart)

app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
})

// app.use((error, req, res, next) => {
//   console.log("HERE 1 " + JSON.stringify(error))
//   res.status(error.status || 500)
//   res.json({
//     response_code: 401,
//     error: {
//         message: error.message
//     }
//   })
// })

module.exports = app;