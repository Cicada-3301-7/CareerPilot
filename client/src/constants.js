// Kept in sync with the backend enums in server/src/validators.
export const STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"];
export const PRIORITIES = ["Low", "Medium", "High"];

export const STATUS_FILTER_OPTIONS = ["All", "Applied", "OA", "Interview", "Offer", "Rejected"];
export const WORK_MODE_OPTIONS     = ["All", "Remote", "Hybrid", "Onsite"];
export const DATE_RANGE_OPTIONS    = ["All Time", "Today", "Last 7 Days", "Last 30 Days"];
export const SORT_OPTIONS = [
  { value: "newest",     label: "Newest First" },
  { value: "oldest",     label: "Oldest First" },
  { value: "company_az", label: "Company A → Z" },
  { value: "company_za", label: "Company Z → A" },
  { value: "role_az",    label: "Role A → Z" },
  { value: "status",     label: "Status" },
  { value: "deadline",   label: "Upcoming Deadline" },
];
