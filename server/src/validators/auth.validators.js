const z = require("zod");

const REQUIRED_REGISTER = "Name, email, and password are required";
const REQUIRED_LOGIN = "Email and password are required";

const registerSchema = z.object({
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

module.exports = { registerSchema, loginSchema };
