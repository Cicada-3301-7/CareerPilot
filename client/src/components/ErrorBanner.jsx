function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      {message}
      <button type="button" onClick={onDismiss}>Dismiss</button>
    </div>
  );
}

export default ErrorBanner;
