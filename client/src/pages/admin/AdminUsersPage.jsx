import { useCallback, useEffect, useRef, useState } from "react";
import * as adminApi from "../../api/admin";
import { getErrorMessage } from "../../utils/format";
import { useAuth } from "../../context/useAuth";
import ErrorBanner from "../../components/ErrorBanner";
import UsersToolbar from "../../components/admin/UsersToolbar";
import UserList from "../../components/admin/UserList";
import Pagination from "../../components/ui/Pagination";
import ConfirmActionModal from "../../components/admin/ConfirmActionModal";
import UserDetailModal from "../../components/admin/UserDetailModal";

const PAGE_SIZE = 20;

function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [pageMeta, setPageMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Search / Filter / Sort / Pagination state ─────────────────────────────
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(""); // raw input (instant)
  const [searchQuery, setSearchQuery] = useState(""); // debounced value sent to API
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  // ── Modals ────────────────────────────────────────────────────────────────
  const [confirmAction, setConfirmAction] = useState(null); // { type, user }
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [detailUser, setDetailUser] = useState(null);

  // Debounce search input — fire API call 350 ms after user stops typing
  const debounceTimer = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchQuery(val);
      setPage(1);
    }, 350);
  };

  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  // ── Fetch users (server-side search/filter/sort/pagination) ───────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: PAGE_SIZE };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (filterRole !== "All") params.role = filterRole.toLowerCase();
      if (filterStatus !== "All") params.status = filterStatus.toLowerCase();
      if (sortBy !== "newest") params.sort = sortBy;

      const data = await adminApi.getUsers(params);

      // If the page ran past the end (e.g. the result set shrank), snap back
      // to the last page instead of showing a stranded empty page.
      if (data.data.length === 0 && data.total > 0 && page > data.totalPages) {
        setPage(data.totalPages);
        return;
      }

      setUsers(data.data);
      setPageMeta({ page: data.page, total: data.total, totalPages: data.totalPages });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not load users."));
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterRole, filterStatus, sortBy]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter changes always restart from the first page
  const applyFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const activeFilterCount = [
    searchQuery.trim() !== "",
    filterRole !== "All",
    filterStatus !== "All",
    sortBy !== "newest",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setFilterRole("All");
    setFilterStatus("All");
    setSortBy("newest");
    setPage(1);
  };

  // ── Role / status actions (server-confirmed, via confirm modal) ───────────
  const requestAction = (type, user) => {
    setActionError("");
    setConfirmAction({ type, user });
  };

  const closeConfirm = () => {
    if (actionSubmitting) return;
    setConfirmAction(null);
    setActionError("");
  };

  const handleConfirmAction = async () => {
    const { type, user } = confirmAction;
    setActionSubmitting(true);
    setActionError("");

    try {
      const updated =
        type === "promote" || type === "demote"
          ? await adminApi.updateRole(user._id, type === "promote" ? "admin" : "user")
          : await adminApi.updateStatus(
              user._id,
              type === "suspend" ? "suspended" : "active"
            );
      setUsers((current) =>
        current.map((u) => (u._id === updated._id ? updated : u))
      );
      setConfirmAction(null);
    } catch (requestError) {
      // Backend rules (self-change, last-admin) land here; keep the dialog
      // open so the message is read in context.
      setActionError(getErrorMessage(requestError, "Could not update the user."));
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>User management</h1>
          <p className="subtitle">
            Search accounts, manage roles, and control access.
          </p>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <section className="applications-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Admin</p>
            <h2>All users</h2>
          </div>
          <p aria-live="polite">
            {loading
              ? ""
              : `${pageMeta.total} user${pageMeta.total !== 1 ? "s" : ""}`}
          </p>
        </div>

        <UsersToolbar
          searchInput={searchInput}
          onSearchChange={handleSearchChange}
          onClearSearch={() => {
            setSearchInput("");
            setSearchQuery("");
            setPage(1);
          }}
          filterRole={filterRole}
          onRoleFilterChange={applyFilter(setFilterRole)}
          filterStatus={filterStatus}
          onStatusFilterChange={applyFilter(setFilterStatus)}
          sortBy={sortBy}
          onSortChange={applyFilter(setSortBy)}
          activeFilterCount={activeFilterCount}
          onClearAll={clearAllFilters}
        />

        <UserList
          users={users}
          loading={loading}
          error={error}
          onRetry={fetchUsers}
          activeFilterCount={activeFilterCount}
          onClearAll={clearAllFilters}
          currentUserId={currentUser?._id}
          onView={setDetailUser}
          onAction={requestAction}
        />

        <Pagination
          page={pageMeta.page}
          totalPages={pageMeta.totalPages}
          loading={loading}
          onPageChange={setPage}
          label="Users pagination"
        />
      </section>

      {confirmAction && (
        <ConfirmActionModal
          action={confirmAction}
          submitting={actionSubmitting}
          error={actionError}
          onDismissError={() => setActionError("")}
          onConfirm={handleConfirmAction}
          onClose={closeConfirm}
        />
      )}

      {detailUser && (
        <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} />
      )}
    </>
  );
}

export default AdminUsersPage;
