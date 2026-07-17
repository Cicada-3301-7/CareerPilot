import api from "./client";

export const list = (applicationId) =>
  api.get(`/api/applications/${applicationId}/files`).then((res) => res.data);

export const upload = (applicationId, { file, docType }, onUploadProgress) => {
  const formData = new FormData();
  formData.append("docType", docType);
  formData.append("file", file);
  return api
    .post(`/api/applications/${applicationId}/files`, formData, {
      // The shared client defaults to application/json; this override lets
      // axios replace it with the real multipart boundary header.
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    })
    .then((res) => res.data);
};

// Downloads go through the API (a plain <a href> can't carry the JWT header),
// so the caller turns the blob into an object URL and clicks a synthetic link.
export const download = (applicationId, fileId) =>
  api
    .get(`/api/applications/${applicationId}/files/${fileId}/download`, {
      responseType: "blob",
    })
    .then((res) => res.data);

export const remove = (applicationId, fileId) =>
  api
    .delete(`/api/applications/${applicationId}/files/${fileId}`)
    .then((res) => res.data);
