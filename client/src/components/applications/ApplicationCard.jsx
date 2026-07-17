import { STATUSES } from "../../constants";
import { formatDate } from "../../utils/format";

function ApplicationCard({ application, updating, deleting, onStatusChange, onDelete }) {
  return (
    <article className="application-card">
      <div className="card-topline">
        <div>
          <p className="company-name">{application.company}</p>
          <h3>{application.role}</h3>
        </div>
        <span
          className={`priority priority-${application.priority.toLowerCase()}`}
        >
          {application.priority} priority
        </span>
      </div>

      <div className="detail-grid">
        <div>
          <span className="detail-label">Location</span>
          <p>{application.location || "—"}</p>
        </div>
        <div>
          <span className="detail-label">Deadline</span>
          <p>{formatDate(application.deadline)}</p>
        </div>
        <div>
          <span className="detail-label">Job link</span>
          {application.jobLink ? (
            <a
              href={application.jobLink}
              target="_blank"
              rel="noreferrer"
            >
              Open posting ↗
            </a>
          ) : (
            <p>—</p>
          )}
        </div>
        <div>
          <span className="detail-label">Added</span>
          <p>{formatDate(application.createdAt)}</p>
        </div>
      </div>

      <div className="notes-block">
        <span className="detail-label">Notes</span>
        <p>{application.notes || "No notes"}</p>
      </div>

      <div className="card-actions">
        <label>
          <span className="sr-only">Status for {application.role}</span>
          <select
            className={`status-select status-${application.status.toLowerCase()}`}
            value={application.status}
            disabled={updating}
            onChange={(event) => onStatusChange(application._id, event.target.value)}
          >
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>

        <button
          className="delete-button"
          type="button"
          disabled={deleting}
          onClick={() => onDelete(application._id)}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </article>
  );
}

export default ApplicationCard;
