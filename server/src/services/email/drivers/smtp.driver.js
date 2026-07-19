const nodemailer = require("nodemailer");
const env = require("../../../config/env");

// SMTP driver via nodemailer: the escape hatch for any SMTP-speaking provider,
// self-hosted relays, and local development against Mailpit/MailHog. env.js
// guarantees the host is present whenever this driver is selected.
const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  ...(env.smtp.user ? { auth: { user: env.smtp.user, pass: env.smtp.pass } } : {}),
});

const send = async ({ from, replyTo, to, subject, html, text }) => {
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });
  return { messageId: info.messageId };
};

module.exports = { send };
