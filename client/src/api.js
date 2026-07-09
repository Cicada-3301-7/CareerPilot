import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the JWT from localStorage to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cp_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server returns 401, clear the stale token and reload to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("cp_token");
      localStorage.removeItem("cp_user");
      // Only redirect if we're not already on an auth page
      if (!window.location.hash.startsWith("#/login") &&
          !window.location.hash.startsWith("#/register")) {
        window.location.hash = "#/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
