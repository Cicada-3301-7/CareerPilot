import UserTable from "./UserTable";
import UserCard from "./UserCard";
import SkeletonList from "../applications/SkeletonList";

function UserList({
  users,
  loading,
  error,
  onRetry,
  activeFilterCount,
  onClearAll,
  currentUserId,
  onView,
  onAction,
}) {
  if (loading) {
    return (
      <div aria-busy="true">
        <p className="sr-only" role="status">
          Loading users…
        </p>
        <SkeletonList />
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="state-card">
        <p>Something went wrong while loading users.</p>
        <button className="btn btn-secondary" type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="state-card empty-state">
        <span aria-hidden="true">◎</span>
        {activeFilterCount > 0 ? (
          <>
            <h3>No users found</h3>
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
            <h3>No users to show</h3>
            <p>Registered accounts will appear here.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Desktop (≥900px): table. Mobile: cards. Same data and handlers;
          the switch is CSS-only so the two views can't drift. */}
      <UserTable
        users={users}
        currentUserId={currentUserId}
        onView={onView}
        onAction={onAction}
      />
      <div className="user-cards">
        {users.map((user) => (
          <UserCard
            key={user._id}
            user={user}
            isSelf={user._id === currentUserId}
            onView={onView}
            onAction={onAction}
          />
        ))}
      </div>
    </>
  );
}

export default UserList;
