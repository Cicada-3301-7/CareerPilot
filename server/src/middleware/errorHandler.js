const AppError = require("../utils/AppError");

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

// eslint-disable-next-line no-unused-vars -- 4-arg signature required for Express to treat this as error middleware
const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)[0]?.message || "Validation failed";
    return res.status(400).json({ error: message });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ error: err.message });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  console.error(err);
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : FALLBACK_MESSAGE;
  return res.status(status).json({ error: message });
};

module.exports = errorHandler;
