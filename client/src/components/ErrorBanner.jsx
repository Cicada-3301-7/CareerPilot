const ICONS = {
  error: "⚠",
  warning: "ℹ",
};

function ErrorBanner({ message, variant = "error", onDismiss }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${variant}`} role="alert">
      <span className="alert-icon" aria-hidden="true">
        {ICONS[variant] || ICONS.error}
      </span>
      <span className="alert-message">{message}</span>
      {onDismiss && (
        <button
          className="alert-dismiss"
          type="button"
          aria-label="Dismiss message"
          onClick={onDismiss}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default ErrorBanner;
