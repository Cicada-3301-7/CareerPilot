import { useEffect } from "react";

// Transient fixed-position notice built on the shared alert styles.
// Auto-dismisses; the parent owns the message state.
function Toast({ message, variant = "success", onDismiss, duration = 5000 }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, variant, duration, onDismiss]);

  if (!message) return null;

  return (
    <div className={`toast alert alert-${variant}`} role="status">
      <span className="alert-message">{message}</span>
      <button
        className="alert-dismiss"
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        ✕
      </button>
    </div>
  );
}

export default Toast;
