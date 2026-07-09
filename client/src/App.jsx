import { useEffect, useMemo, useState } from "react";
import api from "./api";

const STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"];
const PRIORITIES = ["Low", "Medium", "High"];

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

function App() {
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const { data } = await api.get("/api/applications");
        setApplications(data);
      } catch (requestError) {
        setError(
          getErrorMessage(requestError, "Could not load applications.")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const stats = useMemo(() => {
    const counts = Object.fromEntries(
      STATUSES.map((status) => [status, 0])
    );

    applications.forEach((application) => {
      if (counts[application.status] !== undefined) {
        counts[application.status] += 1;
      }
    });

    return { Total: applications.length, ...counts };
  }, [applications]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      ...form,
      deadline: form.deadline || undefined,
    };

    try {
      const { data } = await api.post("/api/applications", payload);
      setApplications((current) => [data, ...current]);
      setForm(initialForm);
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Could not add the application.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    const previousStatus = applications.find(
      (application) => application._id === id
    )?.status;
    setUpdatingId(id);
    setError("");
    setApplications((current) =>
      current.map((application) =>
        application._id === id ? { ...application, status } : application
      )
    );

    try {
      const { data } = await api.patch(`/api/applications/${id}`, { status });
      setApplications((current) =>
        current.map((application) =>
          application._id === id ? data : application
        )
      );
    } catch (requestError) {
      setApplications((current) =>
        current.map((application) =>
          application._id === id
            ? { ...application, status: previousStatus }
            : application
        )
      );
      setError(
        getErrorMessage(requestError, "Could not update the application.")
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setError("");

    try {
      await api.delete(`/api/applications/${id}`);
      setApplications((current) =>
        current.filter((application) => application._id !== id)
      );
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Could not delete the application.")
      );
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
        <span className="mvp-badge">MVP</span>
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

        <section className="applications-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">PIPELINE</p>
              <h2>Your applications</h2>
            </div>
            {!loading && <p>{applications.length} tracked</p>}
          </div>

          {loading ? (
            <div className="state-card">Loading applications…</div>
          ) : applications.length === 0 ? (
            <div className="state-card empty-state">
              <span>◎</span>
              <h3>No applications yet</h3>
              <p>Add your first opportunity using the form above.</p>
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

export default App;
