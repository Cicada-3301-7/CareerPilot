import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import ErrorBanner from "../components/ErrorBanner";
import BrandMark from "../components/ui/BrandMark";
import { getErrorMessage } from "../utils/format";

function LoginPage() {
  const { login, sessionNotice, clearSessionNotice } = useAuth();
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
      await login(form.email, form.password);
      // Redirect is declarative: PublicOnlyRoute navigates once authenticated.
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Please try again."));
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <BrandMark />
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome back</h1>
          <p className="subtitle">Sign in to your job search dashboard.</p>
        </div>

        <ErrorBanner
          message={sessionNotice}
          variant={
            sessionNotice.toLowerCase().includes("suspended")
              ? "error"
              : "warning"
          }
          onDismiss={clearSessionNotice}
        />
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
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
              autoComplete="current-password"
              required
            />
          </label>
          <button
            className="btn btn-primary auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading && <span className="spinner spinner-sm" aria-hidden="true" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <p className="auth-switch">
          Don&apos;t have an account?{" "}
          <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
