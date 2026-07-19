import { useEffect } from "react";
import { Routes, Route, Outlet, useNavigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicOnlyRoute from "./routes/PublicOnlyRoute";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import NotFoundPage from "./pages/NotFoundPage";

// The app used hash routing before Phase 11; send old #/login-style
// bookmarks to their clean-URL equivalents.
function LegacyHashRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const { hash } = window.location;
    if (hash.startsWith("#/")) {
      navigate(hash.slice(1), { replace: true });
    }
  }, [navigate]);
  return null;
}

function App() {
  return (
    <>
      <LegacyHashRedirect />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        {/* Email-link landing pages work signed in or out, so no route
            guard; forgot-password mirrors login's public-only behavior. */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route
            path="admin"
            element={
              <ProtectedRoute requireAdmin>
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            {/* Alias kept alongside /admin so stats can grow into its own
                page later without a URL change */}
            <Route path="stats" element={<AdminDashboardPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;
