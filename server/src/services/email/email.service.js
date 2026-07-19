const env = require("../../config/env");
const driver = require("./drivers");

// Transport-only email service: applies the configured sender identity and
// hands the message to the selected driver. It knows nothing about templates,
// users, or HTTP — callers render content (see ./templates) and pass it in.
//
// Missing fields here are programmer errors, not operational HTTP errors, so
// they throw plain Errors rather than AppError.
const sendEmail = async ({ to, subject, html, text }) => {
  if (!to || !subject) {
    throw new Error("sendEmail requires 'to' and 'subject'");
  }
  if (!html && !text) {
    throw new Error("sendEmail requires an 'html' or 'text' body");
  }

  const message = { from: env.emailFrom, to, subject, html, text };
  if (env.emailReplyTo) {
    message.replyTo = env.emailReplyTo;
  }

  return driver.send(message);
};

module.exports = { sendEmail };
