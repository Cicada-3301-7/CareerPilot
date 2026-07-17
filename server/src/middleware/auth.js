const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");

/**
 * Express middleware that verifies the JWT attached in the
 * Authorization header (Bearer <token>) and that the token has
 * not been revoked (its tokenVersion still matches the user's).
 *
 * On success it attaches `req.userId` so downstream route
 * handlers know which user is making the request, plus
 * `req.user = { id, role }` for authorization checks. The role always
 * comes from the current database record (never the JWT), so role
 * changes take effect immediately for already-issued tokens.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired, please log in again" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    // `?? 0` on both sides keeps tokens issued before tokenVersion existed
    // valid. A missing user passes through so controllers keep their own
    // deleted-user contracts (e.g. GET /me returns 404, not 401) — but
    // req.user stays unset, so requireRole denies deleted users.
    const user = await User.findById(payload.userId).select("tokenVersion role status");
    if (user && (payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({ error: "Session expired, please log in again" });
    }
    // Checked per request from the DB, so suspension takes effect immediately
    // for already-issued tokens; a missing status field means active.
    if (user && user.status === "suspended") {
      return res.status(403).json({ error: "Account suspended" });
    }
    if (user) {
      req.user = { id: payload.userId, role: user.role || "user" };
    }
  } catch (err) {
    return next(err);
  }

  req.userId = payload.userId;
  next();
};

module.exports = authenticate;
