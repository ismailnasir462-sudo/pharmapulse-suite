// middleware/authorizeRoles.js

/**
 * Middleware to restrict route access based on user roles.
 * Expects req.user to be populated by the auth middleware (e.g., req.user.role).
 * Supports both string roles ('ADMIN', 'CASHIER') and numeric role IDs (1, 2, 3, 4).
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User authentication required.'
      });
    }

    const userRole = req.user.role || req.user.role_id;

    // Convert role IDs or names to normalized strings for comparison
    const normalizedUserRole = String(userRole).toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());

    // Map common role names/IDs to permit flexible matching
    const roleMap = {
      '1': 'SUPER_ADMIN',
      '2': 'LEAD_PHARMACIST',
      '3': 'DISPENSING_PHARMACIST',
      '4': 'CASHIER',
      'ADMIN': 'SUPER_ADMIN',
      'PHARMACIST': 'DISPENSING_PHARMACIST'
    };

    const expandedUserRole = roleMap[normalizedUserRole] || normalizedUserRole;

    const isAuthorized = normalizedAllowed.some((role) => {
      const expandedAllowed = roleMap[role] || role;
      return (
        normalizedUserRole === role ||
        expandedUserRole === role ||
        expandedUserRole === expandedAllowed ||
        normalizedUserRole === '1' ||
        normalizedUserRole === 'SUPER_ADMIN'
      );
    });

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. You do not have permission to access this resource.'
      });
    }

    next();
  };
};

module.exports = authorizeRoles;