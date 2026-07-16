const AppError = require("../utils/AppError");

const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(new AppError(result.error.issues[0].message, 400));
  }
  req[source] = result.data;
  next();
};

module.exports = validate;
