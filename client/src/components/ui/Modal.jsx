import { useEffect, useRef } from "react";

// Thin wrapper over the native <dialog>: the browser handles focus
// containment, Esc-to-close, and restoring focus to the trigger on close.
// `open` is the single source of truth; the close event (Esc, programmatic)
// syncs back through onClose.
function Modal({ open, onClose, labelledBy, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Focus the intended first field instead of the close button
      dialog.querySelector("[data-autofocus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Clicks on the backdrop target the <dialog> element itself; clicks on
  // content target descendants.
  const handleClick = (event) => {
    if (event.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={handleClick}
    >
      {children}
    </dialog>
  );
}

export default Modal;
