import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

// Login/register are hidden from signed-in users. During restoration we show
// the same loading state rather than flashing a form that may redirect away.
function PublicOnlyRoute({ children }) {
  const { status } = useAuth();

  if (status === "restoring") {
    return (
      <div className="auth-shell">
        <div className="state-card">Loading…</div>
      </div>
    );
  }

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default PublicOnlyRoute;
