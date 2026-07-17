import {
  STATUS_FILTER_OPTIONS,
  WORK_MODE_OPTIONS,
  DATE_RANGE_OPTIONS,
  SORT_OPTIONS,
} from "../../constants";

function ApplicationsToolbar({
  searchInput,
  onSearchChange,
  onClearSearch,
  filterStatus,
  onStatusFilterChange,
  filterWorkMode,
  onWorkModeFilterChange,
  filterDateRange,
  onDateRangeFilterChange,
  sortBy,
  onSortChange,
  activeFilterCount,
  onClearAll,
}) {
  return (
    <div className="toolbar" role="search" aria-label="Search and filter applications">
      {/* Search */}
      <div className="search-wrap">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input
          id="app-search"
          className="search-input"
          type="search"
          placeholder="Search company, role, location, notes…"
          value={searchInput}
          onChange={onSearchChange}
          aria-label="Search applications"
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

      {/* Filters row */}
      <div className="filter-row">
        <label className="filter-label">
          <span>Status</span>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>

        <label className="filter-label">
          <span>Work Mode</span>
          <select
            id="filter-workmode"
            value={filterWorkMode}
            onChange={(e) => onWorkModeFilterChange(e.target.value)}
          >
            {WORK_MODE_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>

        <label className="filter-label">
          <span>Date Applied</span>
          <select
            id="filter-daterange"
            value={filterDateRange}
            onChange={(e) => onDateRangeFilterChange(e.target.value)}
          >
            {DATE_RANGE_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>

        <label className="filter-label">
          <span>Sort by</span>
          <select
            id="filter-sort"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
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

export default ApplicationsToolbar;
