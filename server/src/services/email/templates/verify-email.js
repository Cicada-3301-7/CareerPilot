const { escapeHtml, renderButton, renderLayout } = require("./layout");

// Emailed on registration / resend-verification (wired up in a later phase).
// verifyUrl is the full frontend link carrying the raw token.
const verifyEmail = ({ name, verifyUrl, expiresInHours }) => {
  const subject = "Verify your CareerPilot email address";

  const html = renderLayout({
    title: "Verify your email address",
    bodyHtml: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Confirm this email address to secure your CareerPilot account.</p>
      ${renderButton(verifyUrl, "Verify email")}
      <p>This link expires in ${escapeHtml(expiresInHours)} hours. If the button
      does not work, copy this link into your browser:</p>
      <p style="word-break: break-all;"><a href="${escapeHtml(verifyUrl)}">${escapeHtml(verifyUrl)}</a></p>
      <p>If you did not create a CareerPilot account, you can ignore this email.</p>`,
  });

  const text = [
    `Hi ${name},`,
    "",
    "Confirm this email address to secure your CareerPilot account:",
    verifyUrl,
    "",
    `This link expires in ${expiresInHours} hours.`,
    "If you did not create a CareerPilot account, you can ignore this email.",
  ].join("\n");

  return { subject, html, text };
};

module.exports = verifyEmail;
