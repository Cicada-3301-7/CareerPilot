import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as adminApi from "../../api/admin";
import { getErrorMessage } from "../../utils/format";
import AdminStatsGrid from "../../components/admin/AdminStatsGrid";

function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not load platform statistics."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Admin overview</h1>
          <p className="subtitle">Platform-wide totals across all accounts.</p>
        </div>
        <Link className="btn btn-primary" to="/admin/users">
          Manage users
        </Link>
      </div>

      {loading ? (
        <div className="page-loading" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>Loading statistics…</p>
        </div>
      ) : error ? (
        <div className="state-card">
          <p>Something went wrong while loading platform statistics.</p>
          <button className="btn btn-secondary" type="button" onClick={fetchStats}>
            Try again
          </button>
        </div>
      ) : (
        stats && <AdminStatsGrid stats={stats} />
      )}
    </>
  );
}

export default AdminDashboardPage;
