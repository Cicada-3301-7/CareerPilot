const env = require("../../config/env");
const { sendEmail } = require("./email.service");
const { issueToken } = require("../token.service");
const welcome = require("./templates/welcome");
const verifyEmail = require("./templates/verify-email");

// Composition layer for auth-flow emails: issues tokens, renders templates and
// hands the result to the transport-only email service. Failure policy stays
// with the callers — registration treats a failed send as non-fatal, so these
// throw and controllers decide.

const sendWelcomeEmail = (user) =>
  sendEmail({ to: user.email, ...welcome({ name: user.name, appUrl: env.appUrl }) });

const sendVerificationEmail = async (user) => {
  // issueToken invalidates any previous unused verification token, so exactly
  // one emailed link works at a time. The raw token is base64url — URL-safe
  // without encoding.
  const { token } = await issueToken(user._id, "verify_email");
  const verifyUrl = `${env.appUrl}/verify-email?token=${token}`;

  return sendEmail({
    to: user.email,
    ...verifyEmail({
      name: user.name,
      verifyUrl,
      expiresInHours: env.verifyTokenTtlHours,
    }),
  });
};

module.exports = { sendWelcomeEmail, sendVerificationEmail };
