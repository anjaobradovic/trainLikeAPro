import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import TrainerDetailModal from './TrainerDetailModal';

const TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'ALL', label: 'All' },
];

const STATUS_LABELS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REMOVED: 'Removed',
};

export default function AdminTrainers() {
  const toast = useToast();
  const [statusTab, setStatusTab] = useState('PENDING');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/trainers/', {
        params: { status: statusTab, sort, page },
      });
      setData(res.data);
    } catch {
      toast.error('Failed to load trainers.');
    } finally {
      setLoading(false);
    }
  }, [statusTab, sort, page, toast]);

  useEffect(() => { load(); }, [load]);

  const handleTab = (key) => {
    setStatusTab(key);
    setPage(1);
  };

  const handleSort = (key) => {
    setSort(key);
    setPage(1);
  };

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(data.count / pageSize));

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Trainers</h1>
      <p className="admin-page-subtitle">Approve, reject, or remove trainer accounts.</p>

      <div className="admin-toolbar">
        <div className="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`admin-tab ${statusTab === t.key ? 'active' : ''}`}
              onClick={() => handleTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="admin-sort">
          <span className="admin-sort-label">Sort by:</span>
          <button
            className={`admin-sort-btn ${sort === 'name' ? 'active' : ''}`}
            onClick={() => handleSort('name')}
          >
            Name
          </button>
          <button
            className={`admin-sort-btn ${sort === 'rating' ? 'active' : ''}`}
            onClick={() => handleSort('rating')}
          >
            Rating
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Specialty</th>
              <th>Status</th>
              <th>Avg Rating</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="6" className="admin-empty">Loading...</td></tr>
            )}
            {!loading && data.results.length === 0 && (
              <tr><td colSpan="6" className="admin-empty">No trainers found.</td></tr>
            )}
            {!loading && data.results.map((t) => (
              <tr key={t.id} className="admin-row" onClick={() => setSelectedId(t.id)}>
                <td>{t.full_name}</td>
                <td>{t.email || '—'}</td>
                <td>{t.specialty || '—'}</td>
                <td>
                  <span className={`status-pill status-${t.status.toLowerCase()}`}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                </td>
                <td>{Number(t.average_rating).toFixed(1)}</td>
                <td className="admin-row-action">View →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.count > pageSize && (
        <div className="admin-pagination">
          <button
            className="page-btn"
            disabled={!data.previous}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button
            className="page-btn"
            disabled={!data.next}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {selectedId !== null && (
        <TrainerDetailModal
          trainerId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => { setSelectedId(null); load(); }}
        />
      )}
    </div>
  );
}
