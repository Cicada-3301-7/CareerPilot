import { STATUSES } from "../../constants";

// Renders exactly what GET /api/admin/stats returns: two platform totals and
// the zero-filled per-status application counts.
function AdminStatsGrid({ stats }) {
  return (
    <>
      <section className="stats-grid admin-stats-grid" aria-label="Platform totals">
        <article className="stat-card stat-total">
          <span>Total users</span>
          <strong>{stats.totalUsers}</strong>
        </article>
        <article className="stat-card">
          <span>Total applications</span>
          <strong>{stats.totalApplications}</strong>
        </article>
      </section>

      <section className="applications-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Pipeline</p>
            <h2>Applications by status</h2>
          </div>
        </div>
        <section
          className="stats-grid admin-status-grid"
          aria-label="Applications by status"
        >
          {STATUSES.map((status) => (
            <article
              className={`stat-card stat-${status.toLowerCase()}`}
              key={status}
            >
              <span>{status}</span>
              <strong>{stats.applicationsByStatus?.[status] ?? 0}</strong>
            </article>
          ))}
        </section>
      </section>
    </>
  );
}

export default AdminStatsGrid;
