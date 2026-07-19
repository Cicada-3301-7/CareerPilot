const { Resend } = require("resend");
const env = require("../../../config/env");

// Production driver for the Resend HTTP API. env.js guarantees the API key is
// present whenever this driver is selected.
const client = new Resend(env.resendApiKey);

const send = async ({ from, replyTo, to, subject, html, text }) => {
  const { data, error } = await client.emails.send({
    from,
    to,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
  return { messageId: data.id };
};

module.exports = { send };
