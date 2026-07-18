import Badge from "../ui/Badge";

// Legacy documents may lack role/status; the backend treats both absences as
// the defaults, so the badges do too.
export function RoleBadge({ user }) {
  return <Badge type="role" value={user.role === "admin" ? "Admin" : "User"} />;
}

export function AccountBadge({ user }) {
  return (
    <Badge
      type="account"
      value={user.status === "suspended" ? "Suspended" : "Active"}
    />
  );
}
