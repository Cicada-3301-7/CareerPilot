import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <p className="eyebrow">404</p>
          <h1>Page not found</h1>
          <p className="subtitle">The page you&apos;re looking for doesn&apos;t exist.</p>
        </div>
        <p className="auth-switch">
          <Link to="/">Back to CareerPilot</Link>
        </p>
      </div>
    </div>
  );
}

export default NotFoundPage;
