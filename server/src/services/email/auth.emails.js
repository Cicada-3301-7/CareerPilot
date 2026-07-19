const env = require("../../config/env");
const { sendEmail } = require("./email.service");
const { issueToken } = require("../token.service");
const welcome = require("./templates/welcome");
const verifyEmail = require("./templates/verify-email");
const passwordReset = require("./templates/password-reset");
const passwordChanged = require("./templates/password-changed");

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

const sendPasswordResetEmail = async (user) => {
  const { token } = await issueToken(user._id, "password_reset");
  const resetUrl = `${env.appUrl}/reset-password?token=${token}`;

  return sendEmail({
    to: user.email,
    ...passwordReset({
      name: user.name,
      resetUrl,
      expiresInMinutes: env.resetTokenTtlMinutes,
    }),
  });
};

const sendPasswordChangedEmail = (user) =>
  sendEmail({ to: user.email, ...passwordChanged({ name: user.name }) });

// Catch handler for fire-and-forget sends: business operations never wait on
// (or fail because of) email delivery, so this log line is the only trace of a
// provider incident — it must carry enough context to diagnose one.
const logEmailFailure = (type, user) => (err) =>
  console.error(
    `Failed to send ${type} email (user=${user._id}, to=${user.email}): ${err.message}`
  );

module.exports = {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  logEmailFailure,
};
