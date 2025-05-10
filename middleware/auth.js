const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header (try both formats)
  let token = req.header('x-auth-token');
  
  // If token not found in x-auth-token, try Authorization header
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('Using token from Authorization header');
    }
  }

  // Check if no token found in either location
  if (!token) {
    console.log('Authentication failed: No token provided');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  console.log('Authentication attempt with token:', token.substring(0, 15) + '...');

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Add user from payload to request
    req.user = decoded.user;
    console.log('Authentication successful for user ID:', req.user.id, 'Role:', req.user.role);
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
