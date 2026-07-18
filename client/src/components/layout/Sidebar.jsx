import { Link, NavLink } from "react-router-dom";
import BrandMark from "../ui/BrandMark";
import Avatar from "../ui/Avatar";
import { useAuth } from "../../context/useAuth";

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

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5 13.5 3.6v3.5c0 3.3-2.2 5.8-5.5 7.4-3.3-1.6-5.5-4.1-5.5-7.4V3.6L8 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m5.8 7.7 1.6 1.6 2.8-3.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 13.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.5 2.9a2.5 2.5 0 0 1 0 4.2M11.9 9.9c1.6 0.6 2.6 2 2.6 3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", end: true, Icon: DashboardIcon }],
  },
];

// Rendered only for admins; the /admin routes stay guarded server-side and by
// ProtectedRoute regardless of what the nav shows.
const ADMIN_SECTION = {
  label: "Admin",
  items: [
    { to: "/admin", label: "Overview", end: true, Icon: ShieldIcon },
    { to: "/admin/users", label: "Users", Icon: UsersIcon },
  ],
};

function Sidebar({ id, open, user }) {
  const { isAdmin } = useAuth();
  const sections = isAdmin ? [...NAV_SECTIONS, ADMIN_SECTION] : NAV_SECTIONS;

  return (
    <aside id={id} className={`sidebar${open ? " is-open" : ""}`}>
      <Link className="sidebar-brand" to="/">
        <BrandMark />
      </Link>

      <nav className="sidebar-nav" aria-label="Primary">
        {sections.map((section) => (
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
