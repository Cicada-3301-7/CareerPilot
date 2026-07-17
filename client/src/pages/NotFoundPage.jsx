import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="notfound-shell">
      <p className="notfound-code" aria-hidden="true">
        404
      </p>
      <h1>Page not found</h1>
      <p className="subtitle">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link className="btn btn-primary" to="/">
        Back to dashboard
      </Link>
    </div>
  );
}

export default NotFoundPage;
