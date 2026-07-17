import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
});

// AuthContext registers a callback so session death updates React state and
// routing declaratively — the interceptor never navigates on its own.
let onSessionExpired = null;
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

// Attach the JWT from localStorage to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cp_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // Only token-bearing requests can end a session: a 401 for a wrong login
    // password (no token attached) must stay with the calling page.
    const hadToken = Boolean(error.config?.headers?.Authorization);
    const suspended =
      status === 403 && error.response?.data?.error === "Account suspended";

    if (hadToken && (status === 401 || suspended)) {
      localStorage.removeItem("cp_token");
      localStorage.removeItem("cp_user");
      if (onSessionExpired) {
        onSessionExpired(suspended ? "suspended" : "expired");
      }
    }
    // Every other error — including non-suspension 403s (e.g. admin-only
    // endpoints) — rejects to the caller unchanged.
    return Promise.reject(error);
  }
);

export default api;
