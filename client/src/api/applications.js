import api from "./client";

// No page/limit params are sent, so the API keeps returning the legacy plain
// array (opt-in pagination stays unused, matching pre-refactor behavior).
export const list = (params) =>
  api.get("/api/applications", { params }).then((res) => res.data);

export const create = (payload) =>
  api.post("/api/applications", payload).then((res) => res.data);

export const update = (id, payload) =>
  api.patch(`/api/applications/${id}`, payload).then((res) => res.data);

export const remove = (id) =>
  api.delete(`/api/applications/${id}`).then((res) => res.data);
