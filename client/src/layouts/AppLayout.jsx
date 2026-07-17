import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

function AppLayout() {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const location = useLocation();

  // Mobile drawer closes on navigation
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Esc closes the drawer; focus returns to the toggle button
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setNavOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  // Lock page scroll while the drawer overlays the content
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  const closeNav = () => {
    setNavOpen(false);
    menuButtonRef.current?.focus();
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <Sidebar id="primary-nav" open={navOpen} user={user} />

      {navOpen && (
        <button
          className="sidebar-overlay"
          type="button"
          aria-label="Close navigation"
          onClick={closeNav}
        />
      )}

      <div className="app-main-col">
        <Topbar
          user={user}
          onLogout={logout}
          navOpen={navOpen}
          onMenuClick={() => setNavOpen((open) => !open)}
          menuButtonRef={menuButtonRef}
        />

        <main id="main-content" className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
