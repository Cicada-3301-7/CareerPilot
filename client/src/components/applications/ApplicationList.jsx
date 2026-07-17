import ApplicationCard from "./ApplicationCard";
import ApplicationTable from "./ApplicationTable";
import SkeletonList from "./SkeletonList";

function ApplicationList({
  applications,
  loading,
  error,
  onRetry,
  activeFilterCount,
  onClearAll,
  onAddClick,
  updatingId,
  deletingId,
  onStatusChange,
  onDelete,
}) {
  if (loading) {
    return (
      <div aria-busy="true">
        <p className="sr-only" role="status">
          Loading applications…
        </p>
        <SkeletonList />
      </div>
    );
  }

  if (error && applications.length === 0) {
    return (
      <div className="state-card">
        <p>Something went wrong while loading your applications.</p>
        <button className="btn btn-secondary" type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="state-card empty-state">
        <span aria-hidden="true">◎</span>
        {activeFilterCount > 0 ? (
          <>
            <h3>No results found</h3>
            <p>Try adjusting your search or filters.</p>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onClearAll}
            >
              Clear filters
            </button>
          </>
        ) : (
          <>
            <h3>Track your first application</h3>
            <p>
              Everything you add shows up here — statuses, deadlines, links,
              and notes.
            </p>
            <button className="btn btn-primary" type="button" onClick={onAddClick}>
              + Add application
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Desktop (≥900px): table. Mobile: cards. Same data and handlers;
          the switch is CSS-only so the two views can't drift. */}
      <ApplicationTable
        applications={applications}
        updatingId={updatingId}
        deletingId={deletingId}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />
      <div className="application-cards">
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
    </>
  );
}

export default ApplicationList;
