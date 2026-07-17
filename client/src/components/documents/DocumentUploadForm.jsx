import { useRef, useState } from "react";
import * as filesApi from "../../api/files";
import { DOC_TYPES, MAX_DOCUMENT_SIZE_MB } from "../../constants";
import { formatFileSize, getErrorMessage } from "../../utils/format";
import ErrorBanner from "../ErrorBanner";

// Mirrors the backend allowlist for a faster reject; the server re-validates
// extension, MIME type, and magic bytes regardless.
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"];

const hasAllowedExtension = (name) =>
  ALLOWED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

function DocumentUploadForm({ applicationId, fileCount, maxFiles, onUploaded }) {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("resume");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const atCap = fileCount >= maxFiles;

  const resetFileInput = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileChange = (event) => {
    setError("");
    setFile(event.target.files?.[0] || null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (!hasAllowedExtension(file.name)) {
      setError("File type not allowed. Upload a PDF, DOC, DOCX, PNG or JPG file.");
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE_MB * 1024 * 1024) {
      setError(`File exceeds the ${MAX_DOCUMENT_SIZE_MB} MB limit`);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError("");
    try {
      const data = await filesApi.upload(
        applicationId,
        { file, docType },
        (progressEvent) => {
          if (progressEvent.total) {
            setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
          }
        }
      );
      onUploaded(data);
      resetFileInput();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not upload the document."));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <div className="upload-row">
        <label className="upload-type">
          Type
          <select
            value={docType}
            onChange={(event) => setDocType(event.target.value)}
            disabled={uploading || atCap}
          >
            {DOC_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={`btn btn-secondary upload-pick${uploading || atCap ? " is-disabled" : ""}`}>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept={ALLOWED_EXTENSIONS.join(",")}
            onChange={handleFileChange}
            disabled={uploading || atCap}
          />
          Choose file
        </label>

        <button
          className="btn btn-primary"
          type="submit"
          disabled={uploading || atCap || !file}
        >
          {uploading && <span className="spinner spinner-sm" aria-hidden="true" />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      <p className="upload-selection" aria-live="polite">
        {atCap
          ? "Document limit reached — delete one to upload another."
          : file
            ? `${file.name} · ${formatFileSize(file.size)}`
            : `No file chosen. PDF, DOC, DOCX, PNG or JPG up to ${MAX_DOCUMENT_SIZE_MB} MB.`}
      </p>

      {uploading && (
        <div
          className="upload-progress"
          role="progressbar"
          aria-label="Upload progress"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </form>
  );
}

export default DocumentUploadForm;
