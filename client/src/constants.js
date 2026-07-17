// Kept in sync with the backend enums in server/src/validators.
export const STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"];
export const PRIORITIES = ["Low", "Medium", "High"];
export const WORK_MODES = ["Remote", "Hybrid", "Onsite"];

export const STATUS_FILTER_OPTIONS = ["All", "Applied", "OA", "Interview", "Offer", "Rejected"];
export const WORK_MODE_OPTIONS     = ["All", "Remote", "Hybrid", "Onsite"];
export const DATE_RANGE_OPTIONS    = ["All Time", "Today", "Last 7 Days", "Last 30 Days"];
// Normalized values stored by the backend; labels are what users see.
export const DOC_TYPES = [
  { value: "resume", label: "Resume" },
  { value: "cover_letter", label: "Cover Letter" },
  { value: "offer_letter", label: "Offer Letter" },
  { value: "other", label: "Other" },
];
export const DOC_TYPE_LABELS = Object.fromEntries(
  DOC_TYPES.map(({ value, label }) => [value, label])
);

// Mirrors the backend defaults (MAX_FILE_SIZE / MAX_FILES_PER_APPLICATION) for
// client-side pre-checks; the server remains authoritative if they drift.
export const MAX_DOCUMENT_SIZE_MB = 5;
export const MAX_DOCUMENTS_PER_APPLICATION = 10;

export const SORT_OPTIONS = [
  { value: "newest",     label: "Newest First" },
  { value: "oldest",     label: "Oldest First" },
  { value: "company_az", label: "Company A → Z" },
  { value: "company_za", label: "Company Z → A" },
  { value: "role_az",    label: "Role A → Z" },
  { value: "status",     label: "Status" },
  { value: "deadline",   label: "Upcoming Deadline" },
];
