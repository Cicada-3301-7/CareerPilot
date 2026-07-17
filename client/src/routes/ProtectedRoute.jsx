import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

// UX-only guard — the backend re-authorizes every request regardless.
// While a stored token is being validated ("restoring"), nothing is granted:
// cached local data never authorizes a protected or admin route on its own.
function ProtectedRoute({ requireAdmin = false, children }) {
  const { status, user } = useAuth();

  if (status === "restoring") {
    return (
      <div className="auth-shell">
        <div className="state-card">Loading…</div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
