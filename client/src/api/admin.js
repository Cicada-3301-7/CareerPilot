import api from "./client";

// All endpoints require an admin token; the shared client attaches it and the
// backend re-authorizes every request (403s pass through to the caller).
export const getStats = () => api.get("/api/admin/stats").then((res) => res.data);

// Returns { data, page, limit, total, totalPages } — the list lives on `data`.
export const getUsers = (params) =>
  api.get("/api/admin/users", { params }).then((res) => res.data);

// Returns { user, applications: { total, byStatus } }.
export const getUser = (id) =>
  api.get(`/api/admin/users/${id}`).then((res) => res.data);

export const updateRole = (id, role) =>
  api.patch(`/api/admin/users/${id}/role`, { role }).then((res) => res.data.user);

export const updateStatus = (id, status) =>
  api.patch(`/api/admin/users/${id}/status`, { status }).then((res) => res.data.user);
