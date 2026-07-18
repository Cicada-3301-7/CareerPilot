// Admin-domain filter options stay local to the admin components; the values
// map to the /api/admin/users query params (lowercased for role/status).
const ROLE_FILTER_OPTIONS = ["All", "User", "Admin"];
const STATUS_FILTER_OPTIONS = ["All", "Active", "Suspended"];
const USER_SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name_az", label: "Name A → Z" },
  { value: "name_za", label: "Name Z → A" },
  { value: "email_az", label: "Email A → Z" },
];

function UsersToolbar({
  searchInput,
  onSearchChange,
  onClearSearch,
  filterRole,
  onRoleFilterChange,
  filterStatus,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  activeFilterCount,
  onClearAll,
}) {
  return (
    <div className="toolbar" role="search" aria-label="Search and filter users">
      <div className="search-wrap">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input
          id="user-search"
          className="search-input"
          type="search"
          placeholder="Search by name or email…"
          value={searchInput}
          onChange={onSearchChange}
          aria-label="Search users"
        />
        {searchInput && (
          <button
            className="search-clear"
            type="button"
            aria-label="Clear search"
            onClick={onClearSearch}
          >
            ✕
          </button>
        )}
      </div>

      <div className="filter-row">
        <label className="filter-label">
          <span>Role</span>
          <select
            id="filter-user-role"
            value={filterRole}
            onChange={(e) => onRoleFilterChange(e.target.value)}
          >
            {ROLE_FILTER_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>

        <label className="filter-label">
          <span>Status</span>
          <select
            id="filter-user-status"
            value={filterStatus}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>

        <label className="filter-label">
          <span>Sort by</span>
          <select
            id="filter-user-sort"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
          >
            {USER_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        {activeFilterCount > 0 && (
          <button
            className="clear-filters-btn"
            type="button"
            onClick={onClearAll}
          >
            Clear all
            <span className="filter-count-badge">{activeFilterCount}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default UsersToolbar;
