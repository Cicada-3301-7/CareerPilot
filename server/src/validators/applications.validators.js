const z = require("zod");

const STATUS_VALUES = ["Applied", "OA", "Interview", "Offer", "Rejected"];
const PRIORITY_VALUES = ["Low", "Medium", "High"];
const WORK_MODE_VALUES = ["Remote", "Hybrid", "Onsite"];
const DATE_RANGE_VALUES = ["Today", "Last 7 Days", "Last 30 Days"];
const SORT_VALUES = ["oldest", "company_az", "company_za", "role_az", "status", "deadline"];

const emptyStringToUndefined = (v) => (v === "" ? undefined : v);

const createApplicationSchema = z.strictObject({
  company: z.string({ error: () => "Company is required" }).trim().min(1, "Company is required"),
  role: z.string({ error: () => "Role is required" }).trim().min(1, "Role is required"),
  location: z.string().optional(),
  jobLink: z.string().optional(),
  notes: z.string().optional(),
  priority: z.enum(PRIORITY_VALUES).optional(),
  status: z.enum(STATUS_VALUES).optional(),
  deadline: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
});

const updateApplicationSchema = z.strictObject({
  company: z.string({ error: () => "Company is required" }).trim().min(1, "Company is required").optional(),
  role: z.string({ error: () => "Role is required" }).trim().min(1, "Role is required").optional(),
  location: z.string().optional(),
  jobLink: z.string().optional(),
  notes: z.string().optional(),
  priority: z.enum(PRIORITY_VALUES).optional(),
  status: z.enum(STATUS_VALUES).optional(),
  deadline: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
});

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(STATUS_VALUES).optional().catch(undefined),
  workMode: z.enum(WORK_MODE_VALUES).optional().catch(undefined),
  dateRange: z.enum(DATE_RANGE_VALUES).optional().catch(undefined),
  sort: z.enum(SORT_VALUES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  limit: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
});

module.exports = { createApplicationSchema, updateApplicationSchema, listQuerySchema };
