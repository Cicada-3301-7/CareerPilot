import { Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function AppLayout() {
  const { user, logout } = useAuth();

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
            <span className="user-name">{user?.name}</span>
            <button className="logout-button" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}

export default AppLayout;
