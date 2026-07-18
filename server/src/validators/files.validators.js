const z = require("zod");

// Normalized values stored in MongoDB; the frontend maps them to friendly
// labels (Resume, Cover Letter, …). Kept in sync with the ApplicationFile
// schema enum and client/src/constants.js.
const DOC_TYPES = ["resume", "cover_letter", "offer_letter", "other"];

// Multipart text fields land on req.body via multer, so this runs AFTER
// uploadSingle in the chain. strictObject keeps the mass-assignment guarantee:
// a smuggled storageKey/userId text field is a 400, not silent data.
const uploadFileSchema = z.strictObject({
  docType: z.enum(DOC_TYPES, {
    error: () => "Document type must be resume, cover_letter, offer_letter, or other",
  }),
});

// Rejects malformed ids with a clean 400 instead of a Mongoose CastError.
const applicationIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid application id"),
});

const fileParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid application id"),
  fileId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid file id"),
});

module.exports = {
  DOC_TYPES,
  uploadFileSchema,
  applicationIdParamSchema,
  fileParamsSchema,
};
