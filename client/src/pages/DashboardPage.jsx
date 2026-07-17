import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as applicationsApi from "../api/applications";
import { STATUSES } from "../constants";
import { getErrorMessage } from "../utils/format";
import ErrorBanner from "../components/ErrorBanner";
import StatsGrid from "../components/applications/StatsGrid";
import ApplicationForm from "../components/applications/ApplicationForm";
import ApplicationsToolbar from "../components/applications/ApplicationsToolbar";
import ApplicationList from "../components/applications/ApplicationList";

const initialForm = {
  company: "",
  role: "",
  location: "",
  jobLink: "",
  priority: "Medium",
  deadline: "",
  notes: "",
};

function DashboardPage() {
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  // ── Search / Filter / Sort state ────────────────────────────────────────────
  const [searchInput, setSearchInput]   = useState("");   // raw input (instant)
  const [searchQuery, setSearchQuery]   = useState("");   // debounced value sent to API
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterWorkMode, setFilterWorkMode] = useState("All");
  const [filterDateRange, setFilterDateRange] = useState("All Time");
  const [sortBy, setSortBy] = useState("newest");

  // Debounce search input — fire API call 350 ms after user stops typing
  const debounceTimer = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setSearchQuery(val), 350);
  };

  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  // ── Fetch applications (called on mount and on any filter/sort change) ──────
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (searchQuery.trim())           params.search    = searchQuery.trim();
      if (filterStatus !== "All")       params.status    = filterStatus;
      if (filterWorkMode !== "All")     params.workMode  = filterWorkMode;
      if (filterDateRange !== "All Time") params.dateRange = filterDateRange;
      if (sortBy !== "newest")          params.sort      = sortBy;

      const data = await applicationsApi.list(params);
      setApplications(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not load applications."));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus, filterWorkMode, filterDateRange, sortBy]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // ── Stats (always computed from the current result set) ─────────────────────
  const stats = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    applications.forEach((a) => {
      if (counts[a.status] !== undefined) counts[a.status] += 1;
    });
    return { Total: applications.length, ...counts };
  }, [applications]);

  // ── Active filter count (for clear-all badge) ────────────────────────────
  const activeFilterCount = [
    searchQuery.trim() !== "",
    filterStatus !== "All",
    filterWorkMode !== "All",
    filterDateRange !== "All Time",
    sortBy !== "newest",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setFilterStatus("All");
    setFilterWorkMode("All");
    setFilterDateRange("All Time");
    setSortBy("newest");
  };

  // ── Form handlers ────────────────────────────────────────────────────────────
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = { ...form, deadline: form.deadline || undefined };

    try {
      const data = await applicationsApi.create(payload);
      // Prepend the new card only if it would appear in the current view
      setApplications((current) => [data, ...current]);
      setForm(initialForm);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not add the application."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    const previousStatus = applications.find((a) => a._id === id)?.status;
    setUpdatingId(id);
    setError("");
    setApplications((current) =>
      current.map((a) => (a._id === id ? { ...a, status } : a))
    );

    try {
      const data = await applicationsApi.update(id, { status });
      setApplications((current) =>
        current.map((a) => (a._id === id ? data : a))
      );
    } catch (requestError) {
      setApplications((current) =>
        current.map((a) =>
          a._id === id ? { ...a, status: previousStatus } : a
        )
      );
      setError(getErrorMessage(requestError, "Could not update the application."));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setError("");

    try {
      await applicationsApi.remove(id);
      setApplications((current) => current.filter((a) => a._id !== id));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not delete the application."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main>
      <StatsGrid stats={stats} />

      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <ApplicationForm
        form={form}
        submitting={submitting}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
      />

      {/* ── Search / Filter / Sort toolbar ──────────────────────────────── */}
      <section className="applications-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">PIPELINE</p>
            <h2>Your applications</h2>
          </div>
          {!loading && (
            <p>{applications.length} result{applications.length !== 1 ? "s" : ""}</p>
          )}
        </div>

        <ApplicationsToolbar
          searchInput={searchInput}
          onSearchChange={handleSearchChange}
          onClearSearch={() => { setSearchInput(""); setSearchQuery(""); }}
          filterStatus={filterStatus}
          onStatusFilterChange={setFilterStatus}
          filterWorkMode={filterWorkMode}
          onWorkModeFilterChange={setFilterWorkMode}
          filterDateRange={filterDateRange}
          onDateRangeFilterChange={setFilterDateRange}
          sortBy={sortBy}
          onSortChange={setSortBy}
          activeFilterCount={activeFilterCount}
          onClearAll={clearAllFilters}
        />

        <ApplicationList
          applications={applications}
          loading={loading}
          activeFilterCount={activeFilterCount}
          onClearAll={clearAllFilters}
          updatingId={updatingId}
          deletingId={deletingId}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      </section>
    </main>
  );
}

export default DashboardPage;
