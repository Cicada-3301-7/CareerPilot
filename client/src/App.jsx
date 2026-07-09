import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "./api";

const STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"];
const PRIORITIES = ["Low", "Medium", "High"];

const STATUS_FILTER_OPTIONS = ["All", "Applied", "OA", "Interview", "Offer", "Rejected"];
const WORK_MODE_OPTIONS     = ["All", "Remote", "Hybrid", "Onsite"];
const DATE_RANGE_OPTIONS    = ["All Time", "Today", "Last 7 Days", "Last 30 Days"];
const SORT_OPTIONS = [
  { value: "newest",     label: "Newest First" },
  { value: "oldest",     label: "Oldest First" },
  { value: "company_az", label: "Company A → Z" },
  { value: "company_za", label: "Company Z → A" },
  { value: "role_az",    label: "Role A → Z" },
  { value: "status",     label: "Status" },
  { value: "deadline",   label: "Upcoming Deadline" },
];

const initialForm = {
  company: "",
  role: "",
  location: "",
  jobLink: "",
  priority: "Medium",
  deadline: "",
  notes: "",
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.error || fallback;

const formatDate = (date) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
};

// ─── Auth helpers ─────────────────────────────────────────────────────────────

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("cp_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveAuth = (token, user) => {
  localStorage.setItem("cp_token", token);
  localStorage.setItem("cp_user", JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem("cp_token");
  localStorage.removeItem("cp_user");
};

// ─── Simple hash router ───────────────────────────────────────────────────────

const getPage = () => {
  const hash = window.location.hash;
  if (hash.startsWith("#/register")) return "register";
  if (hash.startsWith("#/login")) return "login";
  return "dashboard";
};

// ─── LoginPage ────────────────────────────────────────────────────────────────

function LoginPage({ onAuth }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/api/auth/login", form);
      saveAuth(data.token, data.user);
      onAuth(data.user);
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <p className="eyebrow">WELCOME BACK</p>
          <h1>CareerPilot</h1>
          <p className="subtitle">Sign in to your job search dashboard.</p>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button type="button" onClick={() => setError("")}>Dismiss</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </label>
          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account?{" "}
          <a href="#/register">Create one</a>
        </p>
      </div>
    </div>
  );
}

// ─── RegisterPage ─────────────────────────────────────────────────────────────

function RegisterPage({ onAuth }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/api/auth/register", form);
      saveAuth(data.token, data.user);
      onAuth(data.user);
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <p className="eyebrow">GET STARTED</p>
          <h1>CareerPilot</h1>
          <p className="subtitle">Create your free account to start tracking.</p>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button type="button" onClick={() => setError("")}>Dismiss</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Name
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Alex Kim"
              required
              autoFocus
            />
          </label>
          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>
          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <a href="#/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ user, onLogout }) {
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

      const { data } = await api.get("/api/applications", { params });
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
      const { data } = await api.post("/api/applications", payload);
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
      const { data } = await api.patch(`/api/applications/${id}`, { status });
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
      await api.delete(`/api/applications/${id}`);
      setApplications((current) => current.filter((a) => a._id !== id));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not delete the application."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">YOUR JOB SEARCH, ORGANIZED</p>
          <h1>CareerPilot</h1>
          <p className="subtitle">
            Keep every opportunity and next step in one place.
          </p>
        </div>
        <div className="header-right">
          <span className="mvp-badge">MVP</span>
          <div className="user-menu">
            <span className="user-name">{user.name}</span>
            <button className="logout-button" type="button" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="stats-grid" aria-label="Application statistics">
          {Object.entries(stats).map(([label, count]) => (
            <article className={`stat-card stat-${label.toLowerCase()}`} key={label}>
              <span>{label}</span>
              <strong>{count}</strong>
            </article>
          ))}
        </section>

        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button type="button" onClick={() => setError("")}>
              Dismiss
            </button>
          </div>
        )}

        <section className="panel form-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">NEW OPPORTUNITY</p>
              <h2>Add an application</h2>
            </div>
            <p>Fields marked * are required.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Company *
                <input
                  name="company"
                  value={form.company}
                  onChange={handleInputChange}
                  placeholder="Acme Inc."
                  required
                />
              </label>

              <label>
                Role *
                <input
                  name="role"
                  value={form.role}
                  onChange={handleInputChange}
                  placeholder="Frontend Engineer"
                  required
                />
              </label>

              <label>
                Location
                <input
                  name="location"
                  value={form.location}
                  onChange={handleInputChange}
                  placeholder="Remote"
                />
              </label>

              <label>
                Job link
                <input
                  type="url"
                  name="jobLink"
                  value={form.jobLink}
                  onChange={handleInputChange}
                  placeholder="https://example.com/job"
                />
              </label>

              <label>
                Priority
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleInputChange}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>

              <label>
                Deadline
                <input
                  type="date"
                  name="deadline"
                  value={form.deadline}
                  onChange={handleInputChange}
                />
              </label>

              <label className="full-width">
                Notes
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleInputChange}
                  placeholder="Recruiter details, next steps, or reminders..."
                  rows="3"
                />
              </label>
            </div>

            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add application"}
            </button>
          </form>
        </section>

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
                onChange={handleSearchChange}
                aria-label="Search applications"
              />
              {searchInput && (
                <button
                  className="search-clear"
                  type="button"
                  aria-label="Clear search"
                  onClick={() => { setSearchInput(""); setSearchQuery(""); }}
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
                  onChange={(e) => setFilterStatus(e.target.value)}
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
                  onChange={(e) => setFilterWorkMode(e.target.value)}
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
                  onChange={(e) => setFilterDateRange(e.target.value)}
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
                  onChange={(e) => setSortBy(e.target.value)}
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
                  onClick={clearAllFilters}
                >
                  Clear all
                  <span className="filter-count-badge">{activeFilterCount}</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Application list ─────────────────────────────────────────── */}
          {loading ? (
            <div className="state-card">Loading applications…</div>
          ) : applications.length === 0 ? (
            <div className="state-card empty-state">
              <span>◎</span>
              {activeFilterCount > 0 ? (
                <>
                  <h3>No results found</h3>
                  <p>Try adjusting your search or filters.</p>
                  <button
                    className="primary-button"
                    type="button"
                    style={{ marginTop: "12px", display: "inline-block" }}
                    onClick={clearAllFilters}
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <h3>No applications yet</h3>
                  <p>Add your first opportunity using the form above.</p>
                </>
              )}
            </div>
          ) : (
            <div className="application-list">
              {applications.map((application) => (
                <article className="application-card" key={application._id}>
                  <div className="card-topline">
                    <div>
                      <p className="company-name">{application.company}</p>
                      <h3>{application.role}</h3>
                    </div>
                    <span
                      className={`priority priority-${application.priority.toLowerCase()}`}
                    >
                      {application.priority} priority
                    </span>
                  </div>

                  <div className="detail-grid">
                    <div>
                      <span className="detail-label">Location</span>
                      <p>{application.location || "—"}</p>
                    </div>
                    <div>
                      <span className="detail-label">Deadline</span>
                      <p>{formatDate(application.deadline)}</p>
                    </div>
                    <div>
                      <span className="detail-label">Job link</span>
                      {application.jobLink ? (
                        <a
                          href={application.jobLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open posting ↗
                        </a>
                      ) : (
                        <p>—</p>
                      )}
                    </div>
                    <div>
                      <span className="detail-label">Added</span>
                      <p>{formatDate(application.createdAt)}</p>
                    </div>
                  </div>

                  <div className="notes-block">
                    <span className="detail-label">Notes</span>
                    <p>{application.notes || "No notes"}</p>
                  </div>

                  <div className="card-actions">
                    <label>
                      <span className="sr-only">Status for {application.role}</span>
                      <select
                        className={`status-select status-${application.status.toLowerCase()}`}
                        value={application.status}
                        disabled={updatingId === application._id}
                        onChange={(event) =>
                          handleStatusChange(application._id, event.target.value)
                        }
                      >
                        {STATUSES.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </label>

                    <button
                      className="delete-button"
                      type="button"
                      disabled={deletingId === application._id}
                      onClick={() => handleDelete(application._id)}
                    >
                      {deletingId === application._id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ─── App (router) ─────────────────────────────────────────────────────────────

function App() {
  const [user, setUser] = useState(getStoredUser);
  const [page, setPage] = useState(getPage);

  // Keep page state in sync with the URL hash
  useEffect(() => {
    const onHashChange = () => setPage(getPage());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // If there's no token, always redirect to login
  useEffect(() => {
    const token = localStorage.getItem("cp_token");
    if (!token && page === "dashboard") {
      window.location.hash = "#/login";
    }
  }, [page]);

  const handleAuth = (authenticatedUser) => {
    setUser(authenticatedUser);
    window.location.hash = "#/";
    setPage("dashboard");
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    window.location.hash = "#/login";
    setPage("login");
  };

  if (page === "register") {
    return <RegisterPage onAuth={handleAuth} />;
  }

  if (!user || page === "login") {
    return <LoginPage onAuth={handleAuth} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
