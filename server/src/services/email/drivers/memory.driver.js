const crypto = require("crypto");

// In-memory driver for the test suite: records every message in an outbox so
// tests can assert on delivered mail without any network dependency.
const outbox = [];

const send = async (message) => {
  const messageId = crypto.randomUUID();
  outbox.push({ ...message, messageId, sentAt: new Date() });
  return { messageId };
};

// Test hooks (prefixed to signal they are not part of the driver interface).
const _clear = () => {
  outbox.length = 0;
};

const _lastTo = (to) => [...outbox].reverse().find((message) => message.to === to);

module.exports = { send, _outbox: outbox, _clear, _lastTo };
