const AppError = require("../utils/AppError");

/**
 * Middleware factory for role-based authorization. Must run after
 * `authenticate`, which populates `req.user` from the database record.
 *
 * The decision uses only the server-populated `req.user.role` — never
 * request body, query, headers, or JWT claims. A request without user
 * context (unauthenticated, or a token whose user no longer exists) is
 * denied with 401; an authenticated user outside `allowedRoles` gets 403.
 */
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return next(new AppError("Authentication required", 401));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new AppError("You do not have permission to perform this action", 403));
  }

  next();
};

module.exports = requireRole;
