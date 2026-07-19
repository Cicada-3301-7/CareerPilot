import api from "./client";

export const login = (email, password) =>
  api.post("/api/auth/login", { email, password }).then((res) => res.data);

export const register = (name, email, password) =>
  api.post("/api/auth/register", { name, email, password }).then((res) => res.data);

export const me = () => api.get("/api/auth/me").then((res) => res.data.user);

export const verifyEmail = (token) =>
  api.post("/api/auth/verify-email", { token }).then((res) => res.data);

export const resendVerification = () =>
  api.post("/api/auth/resend-verification", {}).then((res) => res.data);

export const forgotPassword = (email) =>
  api.post("/api/auth/forgot-password", { email }).then((res) => res.data);

export const resetPassword = (token, password) =>
  api.post("/api/auth/reset-password", { token, password }).then((res) => res.data);
