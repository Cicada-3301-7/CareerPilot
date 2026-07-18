import Avatar from "../ui/Avatar";
import UserActions from "./UserActions";
import { RoleBadge, AccountBadge } from "./UserBadges";
import { formatDate } from "../../utils/format";

function UserTable({ users, currentUserId, onView, onAction }) {
  return (
    <div className="user-table-wrap">
      <table className="user-table">
        <caption className="sr-only">Registered users</caption>
        <thead>
          <tr>
            <th scope="col">User</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <th scope="col">Joined</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = user._id === currentUserId;
            const suspended = user.status === "suspended";
            return (
              <tr
                className={`data-row${suspended ? " row-suspended" : ""}`}
                key={user._id}
              >
                <td>
                  <div className="cell-user">
                    <Avatar name={user.name} />
                    <div className="cell-user-text">
                      <span className="cell-user-name">
                        {user.name}
                        {isSelf && <span className="you-chip">You</span>}
                      </span>
                      <span className="cell-user-email">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <RoleBadge user={user} />
                </td>
                <td>
                  <AccountBadge user={user} />
                </td>
                <td className="cell-date">{formatDate(user.createdAt)}</td>
                <td>
                  <div className="cell-actions">
                    <UserActions
                      user={user}
                      isSelf={isSelf}
                      onView={onView}
                      onAction={onAction}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default UserTable;
