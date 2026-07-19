const crypto = require("crypto");

// Development driver: prints each message to the terminal instead of sending
// it, so emailed links (verification, reset) are copyable straight from the
// dev server output. Never use in production — env.js warns if you do.
const send = async (message) => {
  const separator = "─".repeat(60);
  console.log(
    [
      "",
      separator,
      "Email (console driver — not actually sent)",
      `From:    ${message.from}`,
      ...(message.replyTo ? [`Reply-To: ${message.replyTo}`] : []),
      `To:      ${message.to}`,
      `Subject: ${message.subject}`,
      "",
      message.text || "(html-only message)",
      separator,
      "",
    ].join("\n")
  );
  return { messageId: crypto.randomUUID() };
};

module.exports = { send };
