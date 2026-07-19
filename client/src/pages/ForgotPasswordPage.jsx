import { useState } from "react";
import { Link } from "react-router-dom";
import * as authApi from "../api/auth";
import ErrorBanner from "../components/ErrorBanner";
import BrandMark from "../components/ui/BrandMark";
import { getErrorMessage } from "../utils/format";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.forgotPassword(email);
      // The backend answers identically whether or not the account exists;
      // the UI mirrors that with one success state for every address.
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <BrandMark />
      </div>

      <div className="auth-card">
        {submitted ? (
          <div className="auth-status" role="status">
            <span className="auth-status-icon auth-status-success" aria-hidden="true">
              ✉
            </span>
            <h1>Check your inbox</h1>
            <p className="subtitle">
              If an account exists for that email, a password reset link has
              been sent. The link expires in 30 minutes.
            </p>
            <Link className="btn btn-primary" to="/login">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="auth-header">
              <h1>Reset your password</h1>
              <p className="subtitle">
                Enter your account email and we&apos;ll send you a reset link.
              </p>
            </div>

            <ErrorBanner message={error} onDismiss={() => setError("")} />

            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  autoFocus
                />
              </label>
              <button
                className="btn btn-primary auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading && <span className="spinner spinner-sm" aria-hidden="true" />}
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className="auth-switch">
              Remembered it? <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
