import { Link } from "react-router-dom";
import BrandMark from "../ui/BrandMark";
import Avatar from "../ui/Avatar";

function Topbar({ user, onLogout, navOpen, onMenuClick, menuButtonRef }) {
  return (
    <header className="topbar">
      <button
        ref={menuButtonRef}
        className="menu-button"
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={navOpen}
        aria-controls="primary-nav"
        onClick={onMenuClick}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <Link className="topbar-brand" to="/">
        <BrandMark />
      </Link>

      <div className="topbar-spacer" />

      <div className="topbar-user">
        <Avatar name={user?.name} />
        <span className="topbar-user-name">{user?.name}</span>
        <button className="btn btn-secondary btn-sm" type="button" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}

export default Topbar;
