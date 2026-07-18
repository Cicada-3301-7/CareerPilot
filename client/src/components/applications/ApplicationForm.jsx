import { PRIORITIES, WORK_MODES } from "../../constants";
import ErrorBanner from "../ErrorBanner";
import Modal from "../ui/Modal";

function ApplicationForm({
  open,
  onClose,
  form,
  submitting,
  error,
  onDismissError,
  onChange,
  onSubmit,
}) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="add-application-title">
      <div className="modal-header">
        <div>
          <h2 id="add-application-title">Add application</h2>
          <p className="subtitle">Fields marked * are required.</p>
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

      <form onSubmit={onSubmit}>
        <div className="modal-body">
          <ErrorBanner message={error} onDismiss={onDismissError} />

          <div className="form-grid">
            <label>
              Company *
              <input
                name="company"
                value={form.company}
                onChange={onChange}
                placeholder="Acme Inc."
                data-autofocus
                required
              />
            </label>

            <label>
              Role *
              <input
                name="role"
                value={form.role}
                onChange={onChange}
                placeholder="Frontend Engineer"
                required
              />
            </label>

            <label>
              Location
              <input
                name="location"
                value={form.location}
                onChange={onChange}
                placeholder="Berlin / Remote"
              />
            </label>

            <label>
              Work mode
              <select name="workMode" value={form.workMode} onChange={onChange}>
                <option value="">Not specified</option>
                {WORK_MODES.map((mode) => (
                  <option key={mode}>{mode}</option>
                ))}
              </select>
            </label>

            <label>
              Priority
              <select name="priority" value={form.priority} onChange={onChange}>
                {PRIORITIES.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </label>

            <label>
              Deadline
              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={onChange}
              />
            </label>

            <label className="full-width">
              Job link
              <input
                type="url"
                name="jobLink"
                value={form.jobLink}
                onChange={onChange}
                placeholder="https://example.com/job"
              />
            </label>

            <label className="full-width">
              Notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={onChange}
                placeholder="Recruiter details, next steps, or reminders..."
                rows="3"
              />
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting && <span className="spinner spinner-sm" aria-hidden="true" />}
            {submitting ? "Adding…" : "Add application"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ApplicationForm;
