const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Primary Authentication Middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied: Missing authentication token.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Access denied: Invalid or expired token.' });
  }
}

// Role Authorization Middleware
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, message: 'Access denied: No role specified in token.' });
    }

    const userRole = req.user.role.toUpperCase();
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Role '${userRole}' does not have sufficient privileges.`
      });
    }

    next();
  };
}

// Attach authorizeRoles to verifyToken so both import styles work seamlessly:
// 1. const verifyToken = require('../middleware/auth');
// 2. const { verifyToken, authorizeRoles } = require('../middleware/auth');
verifyToken.verifyToken = verifyToken;
verifyToken.authorizeRoles = authorizeRoles;

module.exports = verifyToken;