const { escapeHtml, renderButton, renderLayout } = require("./layout");

// Emailed on forgot-password (wired up in a later phase). resetUrl is the full
// frontend link carrying the raw token.
const passwordReset = ({ name, resetUrl, expiresInMinutes }) => {
  const subject = "Reset your CareerPilot password";

  const html = renderLayout({
    title: "Reset your password",
    bodyHtml: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>We received a request to reset your CareerPilot password.</p>
      ${renderButton(resetUrl, "Reset password")}
      <p>This link expires in ${escapeHtml(expiresInMinutes)} minutes and can be
      used once. If the button does not work, copy this link into your browser:</p>
      <p style="word-break: break-all;"><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>
      <p>If you did not request this, no action is needed — your password has
      not changed.</p>`,
  });

  const text = [
    `Hi ${name},`,
    "",
    "We received a request to reset your CareerPilot password:",
    resetUrl,
    "",
    `This link expires in ${expiresInMinutes} minutes and can be used once.`,
    "If you did not request this, no action is needed — your password has not changed.",
  ].join("\n");

  return { subject, html, text };
};

module.exports = passwordReset;
