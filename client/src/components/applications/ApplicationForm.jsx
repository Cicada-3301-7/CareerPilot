import { PRIORITIES } from "../../constants";

function ApplicationForm({ form, submitting, onChange, onSubmit }) {
  return (
    <section className="panel form-panel">
      <div className="section-heading">
        <div>
          <p className="section-kicker">NEW OPPORTUNITY</p>
          <h2>Add an application</h2>
        </div>
        <p>Fields marked * are required.</p>
      </div>

      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Company *
            <input
              name="company"
              value={form.company}
              onChange={onChange}
              placeholder="Acme Inc."
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
              placeholder="Remote"
            />
          </label>

          <label>
            Job link
            <input
              type="url"
              name="jobLink"
              value={form.jobLink}
              onChange={onChange}
              placeholder="https://example.com/job"
            />
          </label>

          <label>
            Priority
            <select
              name="priority"
              value={form.priority}
              onChange={onChange}
            >
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

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add application"}
        </button>
      </form>
    </section>
  );
}

export default ApplicationForm;
