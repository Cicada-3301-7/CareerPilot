import Avatar from "../ui/Avatar";
import UserActions from "./UserActions";
import { RoleBadge, AccountBadge } from "./UserBadges";
import { formatDate } from "../../utils/format";

function UserCard({ user, isSelf, onView, onAction }) {
  const suspended = user.status === "suspended";

  return (
    <article className={`user-card${suspended ? " is-suspended" : ""}`}>
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

      <div className="card-badges">
        <RoleBadge user={user} />
        <AccountBadge user={user} />
      </div>

      <dl className="card-meta">
        <div>
          <dt>Joined</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </div>
      </dl>

      <div className="card-actions user-card-actions">
        <UserActions
          user={user}
          isSelf={isSelf}
          onView={onView}
          onAction={onAction}
        />
      </div>
    </article>
  );
}

export default UserCard;
