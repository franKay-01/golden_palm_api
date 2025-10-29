const jwt = require('jsonwebtoken');
const { Users, Roles } = require('../models');

function authenticateJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(403).json({ response_code: 300, error: 'Unauthorized' });
  }

  jwt.verify(token, process.env.TOKEN_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ response_code: 300, error: 'Invalid token' });
    }

    req.user = decoded;
    next();
  });
}

async function authenticateAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ response_code: 300, error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_KEY);

    const user = await Users.findOne({
      where: { reference_no: decoded.id },
      include: [
        {
          model: Roles,
          as: 'roles',
          attributes: ['role_name']
        }
      ]
    });

    if (!user) {
      return res.status(403).json({ response_code: 300, error: 'User not found' });
    }

    if (user.roles.role_name !== 'Admin') {
      return res.status(403).json({ response_code: 300, error: 'Admin access required' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ response_code: 300, error: 'Invalid token' });
  }
}

module.exports = { authenticateJWT, authenticateAdmin };
