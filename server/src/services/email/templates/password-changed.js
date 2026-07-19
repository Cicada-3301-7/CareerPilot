const { escapeHtml, renderLayout } = require("./layout");

// Security notification sent after a successful password change (wired up in a
// later phase). Deliberately contains no links — a "was this you?" email full
// of buttons is what phishing looks like.
const passwordChanged = ({ name }) => {
  const subject = "Your CareerPilot password was changed";

  const html = renderLayout({
    title: "Your password was changed",
    bodyHtml: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>The password for your CareerPilot account was just changed, and every
      other active session has been signed out.</p>
      <p>If this was you, no action is needed.</p>
      <p>If this was <strong>not</strong> you, reset your password from the
      login page immediately.</p>`,
  });

  const text = [
    `Hi ${name},`,
    "",
    "The password for your CareerPilot account was just changed, and every",
    "other active session has been signed out.",
    "",
    "If this was you, no action is needed.",
    "If this was NOT you, reset your password from the login page immediately.",
  ].join("\n");

  return { subject, html, text };
};

module.exports = passwordChanged;
