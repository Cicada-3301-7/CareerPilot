const z = require("zod");

const REQUIRED_REGISTER = "Name, email, and password are required";
const REQUIRED_LOGIN = "Email and password are required";

// strictObject so privilege-related fields (role, isAdmin, tokenVersion, …)
// are rejected outright instead of silently ignored.
const registerSchema = z.strictObject({
  name: z.string({ error: () => REQUIRED_REGISTER }).min(1, REQUIRED_REGISTER),
  email: z
    .string({ error: () => REQUIRED_REGISTER })
    .min(1, REQUIRED_REGISTER)
    .regex(/^\S+@\S+\.\S+$/, "Please enter a valid email address"),
  password: z
    .string({ error: () => REQUIRED_REGISTER })
    .min(1, REQUIRED_REGISTER)
    .min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string({ error: () => REQUIRED_LOGIN }).min(1, REQUIRED_LOGIN),
  password: z.string({ error: () => REQUIRED_LOGIN }).min(1, REQUIRED_LOGIN),
});

const verifyEmailSchema = z.strictObject({
  token: z
    .string({ error: () => "Verification token is required" })
    .min(1, "Verification token is required"),
});

// The endpoint takes no input; strictObject still rejects junk fields so the
// route can't be used to smuggle parameters.
const resendVerificationSchema = z.strictObject({});

module.exports = { registerSchema, loginSchema, verifyEmailSchema, resendVerificationSchema };
