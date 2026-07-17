import { Fragment, useState } from "react";
import Badge from "../ui/Badge";
import ConfirmDelete from "../ui/ConfirmDelete";
import StatusSelect from "./StatusSelect";
import { formatDate } from "../../utils/format";

function ApplicationTable({
  applications,
  updatingId,
  deletingId,
  onStatusChange,
  onDelete,
}) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="application-table-wrap">
      <table className="application-table">
        <caption className="sr-only">Job applications</caption>
        <thead>
          <tr>
            <th scope="col">Position</th>
            <th scope="col">Status</th>
            <th scope="col">Priority</th>
            <th scope="col">Work mode</th>
            <th scope="col">Deadline</th>
            <th scope="col">Added</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => {
            const expanded = expandedId === application._id;
            const positionLabel = `${application.role} at ${application.company}`;
            return (
              <Fragment key={application._id}>
                <tr className="data-row">
                  <td>
                    <span className="cell-company">{application.company}</span>
                    <span className="cell-role">{application.role}</span>
                    {application.location && (
                      <span className="cell-location">{application.location}</span>
                    )}
                  </td>
                  <td>
                    <StatusSelect
                      application={application}
                      updating={updatingId === application._id}
                      onStatusChange={onStatusChange}
                    />
                  </td>
                  <td>
                    <Badge type="priority" value={application.priority} />
                  </td>
                  <td>
                    {application.workMode ? (
                      <Badge type="workmode" value={application.workMode} />
                    ) : (
                      <span className="cell-date">—</span>
                    )}
                  </td>
                  <td className="cell-date">{formatDate(application.deadline)}</td>
                  <td className="cell-date">{formatDate(application.createdAt)}</td>
                  <td>
                    <div className="cell-actions">
                      {application.jobLink && (
                        <a
                          className="icon-button"
                          href={application.jobLink}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open job posting for ${positionLabel}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                            <path d="M5 2h6v6M11 2 4.5 8.5M8 11H2V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </a>
                      )}
                      {application.notes && (
                        <button
                          className="notes-toggle"
                          type="button"
                          aria-expanded={expanded}
                          onClick={() =>
                            setExpandedId(expanded ? null : application._id)
                          }
                        >
                          Notes {expanded ? "▴" : "▾"}
                        </button>
                      )}
                      <ConfirmDelete
                        deleting={deletingId === application._id}
                        label={positionLabel}
                        onConfirm={() => onDelete(application._id)}
                      />
                    </div>
                  </td>
                </tr>
                {expanded && application.notes && (
                  <tr className="notes-row">
                    <td colSpan={7}>
                      <p className="notes-content">{application.notes}</p>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ApplicationTable;
