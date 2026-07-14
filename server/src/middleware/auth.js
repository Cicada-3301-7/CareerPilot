const jwt = require("jsonwebtoken");
const env = require("../config/env");

/**
 * Express middleware that verifies the JWT attached in the
 * Authorization header (Bearer <token>).
 *
 * On success it attaches `req.userId` so downstream route
 * handlers know which user is making the request.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.userId = payload.userId;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired, please log in again" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authenticate;
