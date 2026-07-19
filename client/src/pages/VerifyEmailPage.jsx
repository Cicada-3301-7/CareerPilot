import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import * as authApi from "../api/auth";
import BrandMark from "../components/ui/BrandMark";

// Landing page for the emailed verification link. Works signed in or out —
// the endpoint is public, and the link may be opened in any browser.
function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { status, refreshUser } = useAuth();
  const [state, setState] = useState(token ? "verifying" : "invalid");
  // Tokens are single-use, so StrictMode's double-mounted effect must not
  // fire the request twice — the second call would consume-fail and show an
  // error for an account that just verified fine.
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;

    authApi
      .verifyEmail(token)
      .then(() => {
        setState("success");
        // Signed-in users get their banner cleared without a reload. The
        // catch is deliberate: verification itself already succeeded.
        if (localStorage.getItem("cp_token")) {
          refreshUser().catch(() => {});
        }
      })
      .catch(() => setState("invalid"));
  }, [token, refreshUser]);

  const homeLink =
    status === "authenticated" ? (
      <Link className="btn btn-primary" to="/">
        Go to dashboard
      </Link>
    ) : (
      <Link className="btn btn-primary" to="/login">
        Go to login
      </Link>
    );

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <BrandMark />
      </div>

      <div className="auth-card">
        {state === "verifying" && (
          <div className="auth-status" role="status">
            <span className="spinner" aria-hidden="true" />
            <h1>Verifying your email…</h1>
            <p className="subtitle">This will only take a moment.</p>
          </div>
        )}

        {state === "success" && (
          <div className="auth-status" role="status">
            <span className="auth-status-icon auth-status-success" aria-hidden="true">
              ✓
            </span>
            <h1>Email verified</h1>
            <p className="subtitle">
              Your email address is confirmed. You&apos;re all set.
            </p>
            {homeLink}
          </div>
        )}

        {state === "invalid" && (
          <div className="auth-status" role="alert">
            <span className="auth-status-icon auth-status-error" aria-hidden="true">
              !
            </span>
            <h1>Link not valid</h1>
            <p className="subtitle">
              This verification link is invalid or has expired. You can request
              a new one from your dashboard.
            </p>
            {homeLink}
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmailPage;
