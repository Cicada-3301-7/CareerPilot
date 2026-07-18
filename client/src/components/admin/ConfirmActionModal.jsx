import Modal from "../ui/Modal";
import ErrorBanner from "../ErrorBanner";

// Copy per action type. Destructive confirmations (demote/suspend) use the
// danger button; Cancel always receives initial focus as the safe default.
const ACTION_COPY = {
  promote: {
    title: (name) => `Promote ${name} to admin?`,
    body: "Admins can manage every user on the platform, change roles, and suspend accounts.",
    confirmLabel: "Promote to admin",
    busyLabel: "Promoting…",
    confirmClass: "btn-primary",
  },
  demote: {
    title: (name) => `Demote ${name} to user?`,
    body: "They will immediately lose access to the admin dashboard and all user management tools.",
    confirmLabel: "Demote to user",
    busyLabel: "Demoting…",
    confirmClass: "btn-danger",
  },
  suspend: {
    title: (name) => `Suspend ${name}?`,
    body: "They will be signed out and unable to log in until the account is reactivated.",
    confirmLabel: "Suspend account",
    busyLabel: "Suspending…",
    confirmClass: "btn-danger",
  },
  reactivate: {
    title: (name) => `Reactivate ${name}?`,
    body: "They will be able to log in and use their account again immediately.",
    confirmLabel: "Reactivate account",
    busyLabel: "Reactivating…",
    confirmClass: "btn-primary",
  },
};

// Rendered only while an action is pending confirmation; the backend stays
// authoritative (e.g. last-admin rules), so failures surface here and keep
// the dialog open for another attempt or cancel.
function ConfirmActionModal({
  action,
  submitting,
  error,
  onDismissError,
  onConfirm,
  onClose,
}) {
  const copy = ACTION_COPY[action.type];

  return (
    <Modal open onClose={onClose} labelledBy="confirm-action-title">
      <div className="modal-header">
        <div>
          <h2 id="confirm-action-title">{copy.title(action.user.name)}</h2>
          <p className="subtitle">{action.user.email}</p>
        </div>
        <button
          className="modal-close"
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="modal-body">
        <ErrorBanner message={error} onDismiss={onDismissError} />
        <p className="confirm-copy">{copy.body}</p>
      </div>

      <div className="modal-footer">
        <button
          className="btn btn-ghost"
          type="button"
          disabled={submitting}
          onClick={onClose}
          data-autofocus
        >
          Cancel
        </button>
        <button
          className={`btn ${copy.confirmClass}`}
          type="button"
          disabled={submitting}
          onClick={onConfirm}
        >
          {submitting && <span className="spinner spinner-sm" aria-hidden="true" />}
          {submitting ? copy.busyLabel : copy.confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmActionModal;
