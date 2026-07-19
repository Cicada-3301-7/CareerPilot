import { useCallback, useEffect, useState } from "react";
import { setSessionExpiredHandler } from "../api/client";
import * as authApi from "../api/auth";
import { AuthContext } from "./useAuth";

const TOKEN_KEY = "cp_token";
const USER_KEY = "cp_user";

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export function AuthProvider({ children }) {
  // With a stored token the app is "restoring" until /api/auth/me settles —
  // the cached cp_user below only hydrates non-sensitive UI (e.g. the header
  // name); route access is never granted from it.
  const [status, setStatus] = useState(() =>
    localStorage.getItem(TOKEN_KEY) ? "restoring" : "unauthenticated"
  );
  const [user, setUser] = useState(getStoredUser);
  // Shown on the login page after an involuntary sign-out
  const [sessionNotice, setSessionNotice] = useState("");

  const applyAuth = useCallback((token, nextUser) => {
    saveAuth(token, nextUser);
    setUser(nextUser);
    setSessionNotice("");
    setStatus("authenticated");
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login(email, password);
      applyAuth(data.token, data.user);
    },
    [applyAuth]
  );

  const register = useCallback(
    async (name, email, password) => {
      const data = await authApi.register(name, email, password);
      applyAuth(data.token, data.user);
    },
    [applyAuth]
  );

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  // Re-fetches the server's view of the user (e.g. right after email
  // verification) so state like the verify banner updates without a reload.
  const refreshUser = useCallback(async () => {
    const freshUser = await authApi.me();
    localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
    setUser(freshUser);
    return freshUser;
  }, []);

  const clearSessionNotice = useCallback(() => setSessionNotice(""), []);

  // Involuntary sign-outs detected by the API layer (expired/revoked token,
  // or account suspension). Storage is already cleared by the interceptor.
  useEffect(() => {
    setSessionExpiredHandler((reason) => {
      setSessionNotice(
        reason === "suspended"
          ? "Your account has been suspended."
          : "Your session has expired. Please sign in again."
      );
      setUser(null);
      setStatus("unauthenticated");
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  // Startup validation: the stored token only becomes an authenticated
  // session once the server confirms it, which also refreshes stale cached
  // user data (e.g. a role change or a pre-role cp_user shape).
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return undefined;
    let cancelled = false;

    authApi
      .me()
      .then((freshUser) => {
        if (cancelled) return;
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        setUser(freshUser);
        setStatus("authenticated");
      })
      .catch(() => {
        // 401/suspension already ran the session-expired handler; anything
        // else (network failure, deleted account) must not leave the app
        // stuck restoring — fall back to signed-out.
        if (cancelled) return;
        clearAuth();
        setUser(null);
        setStatus((current) => (current === "restoring" ? "unauthenticated" : current));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = {
    user,
    status,
    isAdmin: user?.role === "admin",
    // Boolean() also covers a stale cached cp_user from before this field
    // existed; the startup /me refresh corrects it either way.
    emailVerified: Boolean(user?.emailVerified),
    sessionNotice,
    clearSessionNotice,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
