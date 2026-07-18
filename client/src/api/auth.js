import api from "./client";

export const login = (email, password) =>
  api.post("/api/auth/login", { email, password }).then((res) => res.data);

export const register = (name, email, password) =>
  api.post("/api/auth/register", { name, email, password }).then((res) => res.data);

export const me = () => api.get("/api/auth/me").then((res) => res.data.user);
