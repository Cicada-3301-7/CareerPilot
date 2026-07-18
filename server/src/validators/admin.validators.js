const z = require("zod");

const ROLE_VALUES = ["user", "admin"];
const STATUS_VALUES = ["active", "suspended"];
const USER_SORT_VALUES = ["oldest", "name_az", "name_za", "email_az"];

const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(ROLE_VALUES).optional().catch(undefined),
  status: z.enum(STATUS_VALUES).optional().catch(undefined),
  sort: z.enum(USER_SORT_VALUES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  limit: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
});

// strictObject so a payload can never smuggle extra fields alongside the one
// being changed (mass-assignment protection, matching registerSchema).
const updateRoleSchema = z.strictObject({
  role: z.enum(ROLE_VALUES, { error: () => "Role must be 'user' or 'admin'" }),
});

const updateStatusSchema = z.strictObject({
  status: z.enum(STATUS_VALUES, { error: () => "Status must be 'active' or 'suspended'" }),
});

// Rejects malformed ids with a clean 400 instead of a Mongoose CastError.
const objectIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user id"),
});

module.exports = {
  listUsersQuerySchema,
  updateRoleSchema,
  updateStatusSchema,
  objectIdParamSchema,
};
