import { Link, NavLink } from "react-router-dom";
import BrandMark from "../ui/BrandMark";
import Avatar from "../ui/Avatar";

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", end: true, Icon: DashboardIcon }],
  },
  /* Phase 13: append an "Admin" section here (items gated by isAdmin from
     useAuth) once the /admin routes exist — Users, Platform stats, etc. */
];

function Sidebar({ id, open, user }) {
  return (
    <aside id={id} className={`sidebar${open ? " is-open" : ""}`}>
      <Link className="sidebar-brand" to="/">
        <BrandMark />
      </Link>

      <nav className="sidebar-nav" aria-label="Primary">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="nav-section-label">{section.label}</p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
              >
                <item.Icon />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Avatar name={user?.name} />
        <div className="sidebar-user">
          <div className="sidebar-user-name">{user?.name}</div>
          <div className="sidebar-user-role">{user?.role || "user"}</div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
