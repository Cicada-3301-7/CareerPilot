import { useState } from "react";
import Badge from "../ui/Badge";
import ConfirmDelete from "../ui/ConfirmDelete";
import StatusSelect from "./StatusSelect";
import { formatDate } from "../../utils/format";

function ApplicationCard({ application, updating, deleting, onStatusChange, onDelete }) {
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <article className="application-card">
      <div className="card-topline">
        <div>
          <p className="company-name">{application.company}</p>
          <h3>{application.role}</h3>
        </div>
        <Badge type="priority" value={application.priority} />
      </div>

      <div className="card-badges">
        <StatusSelect
          application={application}
          updating={updating}
          onStatusChange={onStatusChange}
        />
        {application.workMode && (
          <Badge type="workmode" value={application.workMode} />
        )}
      </div>

      <dl className="card-meta">
        {application.location && (
          <div>
            <dt>Location</dt>
            <dd>{application.location}</dd>
          </div>
        )}
        <div>
          <dt>Deadline</dt>
          <dd>{formatDate(application.deadline)}</dd>
        </div>
        <div>
          <dt>Added</dt>
          <dd>{formatDate(application.createdAt)}</dd>
        </div>
      </dl>

      {application.notes && (
        <div className="card-notes">
          <button
            className="notes-toggle"
            type="button"
            aria-expanded={notesOpen}
            onClick={() => setNotesOpen((open) => !open)}
          >
            Notes {notesOpen ? "▴" : "▾"}
          </button>
          {notesOpen && <p className="notes-content">{application.notes}</p>}
        </div>
      )}

      <div className="card-actions">
        {application.jobLink ? (
          <span className="card-link">
            <a href={application.jobLink} target="_blank" rel="noreferrer">
              Open posting ↗
            </a>
          </span>
        ) : (
          <span />
        )}
        <ConfirmDelete
          deleting={deleting}
          label={`${application.role} at ${application.company}`}
          onConfirm={() => onDelete(application._id)}
        />
      </div>
    </article>
  );
}

export default ApplicationCard;
