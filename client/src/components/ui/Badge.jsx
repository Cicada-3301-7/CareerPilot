const slug = (value) => value.toLowerCase().replace(/\s+/g, "-");

// type: "status" | "priority" | "workmode" — pairs with the token-driven
// .status-*, .priority-*, and .badge-workmode classes.
function Badge({ type, value }) {
  if (!value) return null;
  return (
    <span className={`badge badge-${type} ${type}-${slug(value)}`}>{value}</span>
  );
}

export default Badge;
