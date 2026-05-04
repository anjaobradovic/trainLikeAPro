import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const ROLES = [
  { key: 'all', label: 'All' },
  { key: 'admin', label: 'Admins' },
  { key: 'trainer', label: 'Trainers' },
  { key: 'client', label: 'Clients' },
];

const ROLE_PILL = { admin: 'status-pending', trainer: 'status-approved', client: 'status-removed' };
const PAGE_SIZE = 10;

export default function AdminUsers() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [role, setRole] = useState('all');
  const [search, setSearch] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (role !== 'all') params.role = role;
      if (search.trim()) params.search = search.trim();
      if (includeDeleted) params.include_deleted = 'true';
      const res = await api.get('/admin/users/', { params });
      setData(res.data);
    } catch {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [role, search, includeDeleted, page, toast]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString() : '—';

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${confirmDelete.id}/`);
      toast.success(`${confirmDelete.username} deleted.`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">All Users</h1>
      <p className="admin-page-subtitle">Every account across roles — admins, trainers, clients.</p>

      <div className="admin-toolbar">
        <div className="admin-tabs">
          {ROLES.map((r) => (
            <button
              key={r.key}
              className={`admin-tab ${role === r.key ? 'active' : ''}`}
              onClick={() => { setRole(r.key); setPage(1); }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="catalog-search">
          <input
            type="text"
            placeholder="Search by name, username or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <label className="catalog-toggle">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => { setIncludeDeleted(e.target.checked); setPage(1); }}
            />
            Show deleted
          </label>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Active</th>
              <th>Joined</th>
              <th>Last login</th>
              <th style={{ width: 80, textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="7" className="admin-empty">Loading...</td></tr>}
            {!loading && data.results.length === 0 && (
              <tr><td colSpan="7" className="admin-empty">No users match.</td></tr>
            )}
            {!loading && data.results.map((u) => {
              const isSelf = currentUser && currentUser.id === u.id;
              return (
                <tr key={u.id} className={u.is_deleted ? 'row-deleted' : ''}>
                  <td>
                    <div className="catalog-name">{u.full_name}</div>
                    <div className="reset-username">@{u.username}</div>
                  </td>
                  <td>{u.email || '—'}</td>
                  <td>
                    <span className={`status-pill ${ROLE_PILL[u.role] || ''}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.is_deleted ? (
                      <span className="status-pill status-removed">Deleted</span>
                    ) : u.is_active ? (
                      <span className="status-pill status-approved">Active</span>
                    ) : (
                      <span className="status-pill status-canceled">Inactive</span>
                    )}
                  </td>
                  <td>{fmtDate(u.date_joined)}</td>
                  <td>{fmtDate(u.last_login)}</td>
                  <td className="catalog-actions">
                    <button
                      className="icon-btn icon-btn-danger"
                      title={isSelf ? "You can't delete your own account" : 'Delete user'}
                      onClick={() => setConfirmDelete(u)}
                      disabled={u.is_deleted || isSelf}
                    >🗑</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.count > PAGE_SIZE && (
        <div className="admin-pagination">
          <button className="page-btn" disabled={!data.previous}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button className="page-btn" disabled={!data.next}
                  onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="admin-modal-title">Delete user?</h2>
            <p className="admin-confirm-text">
              This soft-deletes <strong>@{confirmDelete.username}</strong> ({confirmDelete.email || 'no email'}).
              The account is hidden by default and cannot log in. You can find it
              again by toggling "Show deleted".
            </p>
            <div className="admin-modal-actions">
              <button className="btn-ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Confirm delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
