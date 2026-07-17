import ApplicationCard from "./ApplicationCard";

function ApplicationList({
  applications,
  loading,
  activeFilterCount,
  onClearAll,
  updatingId,
  deletingId,
  onStatusChange,
  onDelete,
}) {
  if (loading) {
    return <div className="state-card">Loading applications…</div>;
  }

  if (applications.length === 0) {
    return (
      <div className="state-card empty-state">
        <span>◎</span>
        {activeFilterCount > 0 ? (
          <>
            <h3>No results found</h3>
            <p>Try adjusting your search or filters.</p>
            <button
              className="primary-button"
              type="button"
              style={{ marginTop: "12px", display: "inline-block" }}
              onClick={onClearAll}
            >
              Clear filters
            </button>
          </>
        ) : (
          <>
            <h3>No applications yet</h3>
            <p>Add your first opportunity using the form above.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="application-list">
      {applications.map((application) => (
        <ApplicationCard
          key={application._id}
          application={application}
          updating={updatingId === application._id}
          deleting={deletingId === application._id}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default ApplicationList;
