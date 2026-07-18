import { useEffect, useState } from "react";
import * as filesApi from "../../api/files";
import { MAX_DOCUMENTS_PER_APPLICATION } from "../../constants";
import { getErrorMessage } from "../../utils/format";
import ErrorBanner from "../ErrorBanner";
import Modal from "../ui/Modal";
import DocumentUploadForm from "./DocumentUploadForm";
import DocumentList from "./DocumentList";

// Documents for one application: list, upload, download, delete. Owns all
// document state, keyed by the application it was opened for — the same
// "state lives with the fetch" pattern DashboardPage uses for applications.
function DocumentsModal({ application, onClose }) {
  const open = Boolean(application);
  const applicationId = application?._id;

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!applicationId) {
      setFiles([]);
      setError("");
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    filesApi
      .list(applicationId)
      .then((data) => {
        if (!cancelled) setFiles(data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(getErrorMessage(requestError, "Could not load documents."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  const handleUploaded = (file) => {
    setFiles((current) => [file, ...current]);
  };

  const handleDownload = async (file) => {
    setDownloadingId(file._id);
    setError("");
    try {
      const blob = await filesApi.download(applicationId, file._id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not download the document."));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (file) => {
    setDeletingId(file._id);
    setError("");
    try {
      await filesApi.remove(applicationId, file._id);
      setFiles((current) => current.filter((f) => f._id !== file._id));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not delete the document."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="documents-title">
      <div className="modal-header">
        <div>
          <h2 id="documents-title">Documents</h2>
          {application && (
            <p className="subtitle">
              {application.role} at {application.company}
            </p>
          )}
        </div>
        <button
          className="modal-close"
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="modal-body">
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <DocumentUploadForm
          applicationId={applicationId}
          fileCount={files.length}
          maxFiles={MAX_DOCUMENTS_PER_APPLICATION}
          onUploaded={handleUploaded}
        />

        <DocumentList
          files={files}
          loading={loading}
          downloadingId={downloadingId}
          deletingId={deletingId}
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      </div>

      <div className="modal-footer">
        <p className="documents-usage" aria-live="polite">
          {files.length} of {MAX_DOCUMENTS_PER_APPLICATION} documents used
        </p>
        <button className="btn btn-ghost" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

export default DocumentsModal;
