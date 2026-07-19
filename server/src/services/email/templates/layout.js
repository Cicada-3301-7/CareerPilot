// Shared shell for all transactional emails. Deliberately dependency-free:
// templates are plain functions over template literals, styled inline because
// email clients ignore <style> blocks and external CSS.

// Every user-controlled string interpolated into template HTML must pass
// through this — email clients render HTML just like browsers do.
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
  );

// Call-to-action button. The URL is server-generated but still escaped so a
// legitimate "&" in a query string stays valid HTML.
const renderButton = (url, label) =>
  `<p style="margin: 28px 0;">
    <a href="${escapeHtml(url)}"
       style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
      ${escapeHtml(label)}
    </a>
  </p>`;

// title is escaped here (pass it raw); bodyHtml is trusted markup the template
// already built, escaping its own interpolated values.
const renderLayout = ({ title, bodyHtml }) =>
  `<div style="margin: 0; padding: 24px 0; background-color: #f3f4f6; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="padding: 20px 32px; background-color: #111827;">
        <span style="color: #ffffff; font-size: 18px; font-weight: 700;">CareerPilot</span>
      </div>
      <div style="padding: 32px; color: #111827; font-size: 15px; line-height: 1.6;">
        <h1 style="margin: 0 0 16px; font-size: 20px;">${escapeHtml(title)}</h1>
        ${bodyHtml}
      </div>
      <div style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
        You are receiving this email because of activity on your CareerPilot account.
      </div>
    </div>
  </div>`;

module.exports = { escapeHtml, renderButton, renderLayout };
