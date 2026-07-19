import { useCallback, useState } from "react";
import { useAuth } from "../context/useAuth";
import { resendVerification } from "../api/auth";
import Toast from "./ui/Toast";
import { getErrorMessage } from "../utils/format";

// Shown across the app shell while the signed-in user's email is unverified;
// disappears on its own once verification lands (user state refresh).
function VerifyEmailBanner() {
  const { user, emailVerified } = useAuth();
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  const dismissToast = useCallback(() => setToast(null), []);

  if (!user || emailVerified) return null;

  const handleResend = async () => {
    if (sending) return;
    setSending(true);
    try {
      await resendVerification();
      setToast({
        variant: "success",
        message: "Verification email sent. Check your inbox.",
      });
    } catch (err) {
      setToast({
        variant: "error",
        message: getErrorMessage(err, "Could not send the email. Please try again."),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="verify-banner" role="status">
        <span className="verify-banner-text">
          Verify your email to secure your account. We sent a link to{" "}
          <strong>{user.email}</strong>.
        </span>
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={handleResend}
          disabled={sending}
        >
          {sending && <span className="spinner spinner-sm" aria-hidden="true" />}
          {sending ? "Sending…" : "Resend verification email"}
        </button>
      </div>
      <Toast
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={dismissToast}
      />
    </>
  );
}

export default VerifyEmailBanner;
