import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import * as authApi from "../api/auth";
import ErrorBanner from "../components/ErrorBanner";
import BrandMark from "../components/ui/BrandMark";
import { getErrorMessage } from "../utils/format";

const OPAQUE_TOKEN_ERROR = "Invalid or expired reset link";

// Landing page for the emailed reset link. Deliberately not PublicOnly — a
// signed-in user opening the link (e.g. resetting a hijacked account) must
// still be able to complete the flow; the reset revokes their session anyway.
function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { status, logout } = useAuth();

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState(token ? "form" : "invalid");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(token, form.password);
      // The reset revoked every session (tokenVersion bump), including a
      // local one — drop it so the login redirect doesn't bounce back.
      if (status === "authenticated") {
        logout();
      }
      setState("success");
    } catch (err) {
      const message = getErrorMessage(err, "");
      if (message === OPAQUE_TOKEN_ERROR) {
        // The backend intentionally collapses invalid/expired/reused tokens
        // into one opaque error; show the friendly equivalent.
        setState("invalid");
      } else {
        setError(message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Success auto-forwards to login; the button below covers impatient clicks.
  useEffect(() => {
    if (state !== "success") return undefined;
    const timer = setTimeout(() => navigate("/login", { replace: true }), 3000);
    return () => clearTimeout(timer);
  }, [state, navigate]);

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <BrandMark />
      </div>

      <div className="auth-card">
        {state === "form" && (
          <>
            <div className="auth-header">
              <h1>Choose a new password</h1>
              <p className="subtitle">
                Almost done — set a new password for your account.
              </p>
            </div>

            <ErrorBanner message={error} onDismiss={() => setError("")} />

            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                New password
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  autoFocus
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  name="confirm"
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="Repeat the password"
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
                {loading ? "Resetting…" : "Reset password"}
              </button>
            </form>
          </>
        )}

        {state === "success" && (
          <div className="auth-status" role="status">
            <span className="auth-status-icon auth-status-success" aria-hidden="true">
              ✓
            </span>
            <h1>Password reset</h1>
            <p className="subtitle">
              Your password has been changed and all other sessions were signed
              out. Redirecting you to sign in…
            </p>
            <Link className="btn btn-primary" to="/login">
              Sign in now
            </Link>
          </div>
        )}

        {state === "invalid" && (
          <div className="auth-status" role="alert">
            <span className="auth-status-icon auth-status-error" aria-hidden="true">
              !
            </span>
            <h1>Link not valid</h1>
            <p className="subtitle">
              This reset link is invalid or has expired. Reset links can only
              be used once and expire after 30 minutes.
            </p>
            <Link className="btn btn-primary" to="/forgot-password">
              Request a new link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
