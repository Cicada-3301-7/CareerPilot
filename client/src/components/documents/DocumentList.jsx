import Badge from "../ui/Badge";
import ConfirmDelete from "../ui/ConfirmDelete";
import { DOC_TYPE_LABELS } from "../../constants";
import { formatDate, formatFileSize } from "../../utils/format";

function DocumentList({
  files,
  loading,
  downloadingId,
  deletingId,
  onDownload,
  onDelete,
}) {
  if (loading) {
    return (
      <div aria-busy="true">
        <p className="sr-only" role="status">
          Loading documents…
        </p>
        <div className="document-skeleton">
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="state-card empty-state">
        <span aria-hidden="true">◎</span>
        <h3>No documents yet</h3>
        <p>Upload a resume, cover letter, or offer letter to keep everything together.</p>
      </div>
    );
  }

  return (
    <ul className="document-list">
      {files.map((file) => (
        <li key={file._id} className="document-row">
          <div className="document-info">
            <p className="document-name">{file.originalName}</p>
            <p className="document-meta">
              {formatFileSize(file.size)} · Uploaded{" "}
              {formatDate(file.uploadedAt || file.createdAt)}
            </p>
          </div>
          <div className="document-actions">
            <Badge type="doctype" value={DOC_TYPE_LABELS[file.docType] || file.docType} />
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => onDownload(file)}
              disabled={downloadingId === file._id}
            >
              {downloadingId === file._id ? "Downloading…" : "Download"}
            </button>
            <ConfirmDelete
              deleting={deletingId === file._id}
              label={file.originalName}
              onConfirm={() => onDelete(file)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default DocumentList;
