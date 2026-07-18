import { STATUSES } from "../../constants";

// The status control stays a native <select> (keyboard + screen-reader
// friendly) styled as a colored badge; the optimistic-update flow in
// DashboardPage is unchanged.
function StatusSelect({ application, updating, onStatusChange }) {
  return (
    <label>
      <span className="sr-only">
        Status for {application.role} at {application.company}
      </span>
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
  );
}

export default StatusSelect;
