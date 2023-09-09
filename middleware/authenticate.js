const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(200).json({ response_code: 300, error: 'Unauthorized' });
  }

  jwt.verify(token, process.env.TOKEN_KEY, (err, decoded) => {
    if (err) {
      return res.status(200).json({ response_code: 300, error: 'Invalid token' });
    }

    req.user = decoded;
    next();
  });
}

module.exports = authenticateJWT;
