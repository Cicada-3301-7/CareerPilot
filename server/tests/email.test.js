const env = require("../src/config/env");
const { sendEmail } = require("../src/services/email/email.service");
const memoryDriver = require("../src/services/email/drivers/memory.driver");
const consoleDriver = require("../src/services/email/drivers/console.driver");
const { escapeHtml } = require("../src/services/email/templates/layout");
const welcome = require("../src/services/email/templates/welcome");
const verifyEmail = require("../src/services/email/templates/verify-email");
const passwordReset = require("../src/services/email/templates/password-reset");
const passwordChanged = require("../src/services/email/templates/password-changed");

describe("email service", () => {
  it("delivers through the memory driver with the configured sender applied", async () => {
    const result = await sendEmail({
      to: "user@example.com",
      subject: "Hello",
      html: "<p>Hi</p>",
      text: "Hi",
    });

    expect(result.messageId).toEqual(expect.any(String));
    expect(memoryDriver._outbox).toHaveLength(1);

    const message = memoryDriver._outbox[0];
    expect(message).toMatchObject({
      from: env.emailFrom,
      to: "user@example.com",
      subject: "Hello",
      html: "<p>Hi</p>",
      text: "Hi",
      messageId: result.messageId,
    });
  });

  it("accepts a text-only payload", async () => {
    await sendEmail({ to: "user@example.com", subject: "Plain", text: "Just text" });

    expect(memoryDriver._outbox).toHaveLength(1);
    expect(memoryDriver._outbox[0].html).toBeUndefined();
  });

  it("rejects a payload without a recipient", async () => {
    await expect(sendEmail({ subject: "No to", text: "x" })).rejects.toThrow(
      "sendEmail requires 'to' and 'subject'"
    );
  });

  it("rejects a payload without a subject", async () => {
    await expect(sendEmail({ to: "user@example.com", text: "x" })).rejects.toThrow(
      "sendEmail requires 'to' and 'subject'"
    );
  });

  it("rejects a payload without any body", async () => {
    await expect(sendEmail({ to: "user@example.com", subject: "Empty" })).rejects.toThrow(
      "sendEmail requires an 'html' or 'text' body"
    );
  });

  it("finds the most recent message for a recipient via _lastTo", async () => {
    await sendEmail({ to: "a@example.com", subject: "First", text: "1" });
    await sendEmail({ to: "b@example.com", subject: "Other", text: "2" });
    await sendEmail({ to: "a@example.com", subject: "Second", text: "3" });

    expect(memoryDriver._lastTo("a@example.com").subject).toBe("Second");
    expect(memoryDriver._lastTo("missing@example.com")).toBeUndefined();
  });
});

describe("console driver", () => {
  it("prints the message and returns a messageId", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    try {
      const result = await consoleDriver.send({
        from: "CareerPilot <no-reply@careerpilot.local>",
        to: "user@example.com",
        subject: "Console test",
        text: "Body text",
      });

      expect(result.messageId).toEqual(expect.any(String));
      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = logSpy.mock.calls[0][0];
      expect(output).toContain("To:      user@example.com");
      expect(output).toContain("Subject: Console test");
      expect(output).toContain("Body text");
    } finally {
      logSpy.mockRestore();
    }
  });
});

describe("templates", () => {
  const cases = [
    ["welcome", () => welcome({ name: "Ada", appUrl: "https://app.example.com" })],
    [
      "verify-email",
      () =>
        verifyEmail({
          name: "Ada",
          verifyUrl: "https://app.example.com/verify-email?token=abc",
          expiresInHours: 24,
        }),
    ],
    [
      "password-reset",
      () =>
        passwordReset({
          name: "Ada",
          resetUrl: "https://app.example.com/reset-password?token=abc",
          expiresInMinutes: 30,
        }),
    ],
    ["password-changed", () => passwordChanged({ name: "Ada" })],
  ];

  it.each(cases)("%s returns subject, html and text", (_, render) => {
    const { subject, html, text } = render();

    expect(subject).toEqual(expect.any(String));
    expect(subject.length).toBeGreaterThan(0);
    expect(html).toContain("CareerPilot");
    expect(html).toContain("Ada");
    expect(text).toContain("Ada");
  });

  it("verify-email includes the link in both parts", () => {
    const url = "https://app.example.com/verify-email?token=abc&x=1";
    const { html, text } = verifyEmail({ name: "Ada", verifyUrl: url, expiresInHours: 24 });

    expect(text).toContain(url);
    expect(html).toContain(escapeHtml(url));
  });

  it("password-reset includes the link and expiry in both parts", () => {
    const url = "https://app.example.com/reset-password?token=abc";
    const { html, text } = passwordReset({ name: "Ada", resetUrl: url, expiresInMinutes: 30 });

    expect(text).toContain(url);
    expect(html).toContain(escapeHtml(url));
    expect(text).toContain("30 minutes");
  });

  it("welcome omits the button when no appUrl is given", () => {
    const { html, text } = welcome({ name: "Ada" });

    expect(html).not.toContain("<a href=");
    expect(text).not.toContain("Open CareerPilot");
  });

  it("escapes user-controlled values in HTML output", () => {
    const hostile = '<script>alert("x")</script>';
    const { html } = welcome({ name: hostile });

    expect(html).not.toContain(hostile);
    expect(html).toContain("&lt;script&gt;");
  });
});
