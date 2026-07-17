import { useCallback, useEffect, useState } from "react";
import * as adminApi from "../../api/admin";
import { getErrorMessage, formatDate } from "../../utils/format";
import Modal from "../ui/Modal";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import ErrorBanner from "../ErrorBanner";
import { RoleBadge, AccountBadge } from "./UserBadges";

// Rendered only while a user row is selected. Fetches the full detail
// (profile + application counts) on open.
function UserDetailModal({ user, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.getUser(user._id);
      setDetail(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not load user details."));
    } finally {
      setLoading(false);
    }
  }, [user._id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return (
    <Modal open onClose={onClose} labelledBy="user-detail-title">
      <div className="modal-header">
        <div>
          <h2 id="user-detail-title">User details</h2>
          <p className="subtitle">{user.email}</p>
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
        {loading ? (
          <div className="modal-loading" role="status">
            <span className="spinner" aria-hidden="true" />
            <p>Loading user…</p>
          </div>
        ) : error ? (
          <>
            <ErrorBanner message={error} />
            <button
              className="btn btn-secondary"
              type="button"
              onClick={fetchDetail}
            >
              Try again
            </button>
          </>
        ) : (
          detail && (
            <>
              <div className="detail-head">
                <Avatar name={detail.user.name} />
                <div>
                  <h3>{detail.user.name}</h3>
                  <p>{detail.user.email}</p>
                </div>
              </div>

              <div className="detail-badges">
                <RoleBadge user={detail.user} />
                <AccountBadge user={detail.user} />
              </div>

              <dl className="card-meta">
                <div>
                  <dt>Joined</dt>
                  <dd>{formatDate(detail.user.createdAt)}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{formatDate(detail.user.updatedAt)}</dd>
                </div>
                <div>
                  <dt>Applications</dt>
                  <dd>{detail.applications.total}</dd>
                </div>
              </dl>

              <h4 className="detail-section-title">Applications by status</h4>
              <ul className="detail-status-list">
                {Object.entries(detail.applications.byStatus).map(
                  ([status, count]) => (
                    <li key={status}>
                      <Badge type="status" value={status} />
                      <span>{count}</span>
                    </li>
                  )
                )}
              </ul>
            </>
          )
        )}
      </div>

      <div className="modal-footer">
        <button
          className="btn btn-secondary"
          type="button"
          onClick={onClose}
          data-autofocus
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

export default UserDetailModal;
