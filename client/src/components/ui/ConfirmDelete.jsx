import { useEffect, useState } from "react";

// Two-step inline delete: Delete → Confirm/Cancel. The confirm state
// auto-reverts after a few seconds so a stray click can't linger armed.
function ConfirmDelete({ deleting, label, onConfirm }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return undefined;
    const timer = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(timer);
  }, [confirming]);

  if (deleting) {
    return (
      <button className="btn btn-danger-ghost btn-sm" type="button" disabled>
        Deleting…
      </button>
    );
  }

  if (confirming) {
    return (
      <span
        className="confirm-delete"
        role="group"
        aria-label={`Confirm deleting ${label}`}
      >
        <button
          className="btn btn-danger btn-sm"
          type="button"
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
        >
          Confirm
        </button>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      className="btn btn-danger-ghost btn-sm"
      type="button"
      onClick={() => setConfirming(true)}
    >
      Delete
    </button>
  );
}

export default ConfirmDelete;
