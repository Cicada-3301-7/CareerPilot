const { renderButton, renderLayout } = require("./layout");

// Sent after a user's email address is verified (wired up in a later phase).
// appUrl is optional so the template stays reusable in contexts without a link.
const welcome = ({ name, appUrl }) => {
  const subject = "Welcome to CareerPilot";

  const html = renderLayout({
    // renderLayout escapes the title itself — pass the raw name.
    title: `Welcome, ${name}!`,
    bodyHtml: `
      <p>Your CareerPilot account is ready. Track every application, deadline
      and interview in one place — and never lose sight of a follow-up again.</p>
      ${appUrl ? renderButton(appUrl, "Open CareerPilot") : ""}
      <p>Good luck with the search!</p>`,
  });

  const text = [
    `Welcome, ${name}!`,
    "",
    "Your CareerPilot account is ready. Track every application, deadline and",
    "interview in one place — and never lose sight of a follow-up again.",
    ...(appUrl ? ["", `Open CareerPilot: ${appUrl}`] : []),
    "",
    "Good luck with the search!",
  ].join("\n");

  return { subject, html, text };
};

module.exports = welcome;
