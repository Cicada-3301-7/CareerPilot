import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import ErrorBanner from "../components/ErrorBanner";
import BrandMark from "../components/ui/BrandMark";
import { getErrorMessage } from "../utils/format";

function RegisterPage() {
  const { register } = useAuth();
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
      await register(form.name, form.email, form.password);
      // Redirect is declarative: PublicOnlyRoute navigates once authenticated.
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed. Please try again."));
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
          <h1>Create your account</h1>
          <p className="subtitle">Start tracking every opportunity for free.</p>
        </div>

        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Name
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Alex Kim"
              autoComplete="name"
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
              autoComplete="email"
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
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <button
            className="btn btn-primary auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading && <span className="spinner spinner-sm" aria-hidden="true" />}
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
