const env = require("../../../config/env");

// Email driver abstraction. Every driver implements the same interface so the
// email service never knows (or cares) which transport delivers the message:
//   send({ from, replyTo?, to, subject, html, text }) → { messageId }
//
// Message composition (from/replyTo defaults, payload validation) happens in
// email.service.js — drivers only transport what they are given.
const DRIVERS = {
  resend: "./resend.driver",
  smtp: "./smtp.driver",
  console: "./console.driver",
  memory: "./memory.driver",
};

// env.js already validates the driver name; this guard is a safety net for
// programmatic misuse.
const driverPath = DRIVERS[env.emailDriver];
if (!driverPath) {
  throw new Error(`Unknown email driver: ${env.emailDriver}`);
}

module.exports = require(driverPath);
