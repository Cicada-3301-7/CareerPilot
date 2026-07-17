// Row/card action cluster shared by UserTable and UserCard so the two views
// can't drift. Role and status changes go through the confirm modal via
// onAction(type, user); self-targeting controls are disabled (the backend
// rejects them regardless).
function UserActions({ user, isSelf, onView, onAction }) {
  const isAdminRole = user.role === "admin";
  const isSuspended = user.status === "suspended";

  return (
    <>
      <button
        className="btn btn-ghost btn-sm"
        type="button"
        aria-label={`View details for ${user.name}`}
        onClick={() => onView(user)}
      >
        View
      </button>
      <button
        className="btn btn-secondary btn-sm"
        type="button"
        disabled={isSelf}
        title={isSelf ? "You cannot change your own role" : undefined}
        aria-label={
          isAdminRole
            ? `Demote ${user.name} to user`
            : `Promote ${user.name} to admin`
        }
        onClick={() => onAction(isAdminRole ? "demote" : "promote", user)}
      >
        {isAdminRole ? "Demote" : "Promote"}
      </button>
      <button
        className={`btn ${isSuspended ? "btn-secondary" : "btn-danger-ghost"} btn-sm`}
        type="button"
        disabled={isSelf}
        title={isSelf ? "You cannot change your own account status" : undefined}
        aria-label={
          isSuspended ? `Reactivate ${user.name}` : `Suspend ${user.name}`
        }
        onClick={() => onAction(isSuspended ? "reactivate" : "suspend", user)}
      >
        {isSuspended ? "Reactivate" : "Suspend"}
      </button>
    </>
  );
}

export default UserActions;
