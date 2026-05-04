import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const STATUS_LABELS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REMOVED: 'Removed',
};

const GENDER_LABELS = { M: 'Male', F: 'Female', O: 'Other' };

export default function TrainerDetailModal({ trainerId, onClose, onChanged }) {
  const toast = useToast();
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/admin/trainers/${trainerId}/`)
      .then((res) => { if (!cancelled) setTrainer(res.data); })
      .catch(() => { if (!cancelled) toast.error('Failed to load trainer.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [trainerId, toast]);

  const handleApprove = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/trainers/${trainerId}/approve/`);
      toast.success('Trainer approved.');
      onChanged?.();
    } catch {
      toast.error('Failed to approve trainer.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/admin/trainers/${trainerId}/reject/`, { reason: rejectReason.trim() });
      toast.success('Trainer rejected.');
      onChanged?.();
    } catch (err) {
      const msg = err.response?.data?.reason || err.response?.data?.detail || 'Failed to reject trainer.';
      toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await api.delete(`/admin/trainers/${trainerId}/`);
      toast.success('Trainer removed.');
      onChanged?.();
    } catch {
      toast.error('Failed to remove trainer.');
    } finally {
      setBusy(false);
    }
  };

  const status = trainer?.status;
  const removed = trainer?.is_deleted;
  const canApprove = !removed && (status === 'PENDING' || status === 'REJECTED');
  const canReject = !removed && (status === 'PENDING' || status === 'APPROVED');
  const canRemove = !removed && status !== 'REMOVED';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        {loading && <div className="admin-empty">Loading...</div>}

        {!loading && trainer && (
          <>
            <div className="admin-modal-header">
              <div>
                <h2 className="admin-modal-title">{trainer.full_name}</h2>
                <div className="admin-modal-sub">@{trainer.username} · {trainer.email}</div>
              </div>
              <span className={`status-pill status-${status.toLowerCase()}`}>
                {STATUS_LABELS[status] || status}
              </span>
            </div>

            <div className="admin-detail-grid">
              <DetailRow label="Specialty" value={trainer.specialty || '—'} />
              <DetailRow label="License #" value={trainer.license_number || '—'} />
              <DetailRow label="Date of Birth" value={trainer.date_of_birth || '—'} />
              <DetailRow label="Gender" value={GENDER_LABELS[trainer.gender] || '—'} />
              <DetailRow label="Avg Rating" value={Number(trainer.average_rating).toFixed(1)} />
            </div>

            <DetailBlock label="Biography" value={trainer.biography} />
            <DetailBlock label="Qualifications" value={trainer.qualifications} />
            {trainer.rejection_reason && (
              <DetailBlock label="Rejection reason" value={trainer.rejection_reason} tone="warn" />
            )}

            {rejectOpen && (
              <div className="admin-reject-box">
                <label className="admin-reject-label">Rejection reason</label>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this trainer is being rejected"
                />
                <div className="admin-modal-actions">
                  <button className="btn-ghost" onClick={() => setRejectOpen(false)} disabled={busy}>Cancel</button>
                  <button className="btn-danger" onClick={handleReject} disabled={busy}>Confirm reject</button>
                </div>
              </div>
            )}

            {confirmRemove && (
              <div className="admin-reject-box">
                <p className="admin-confirm-text">
                  Remove this trainer? This is a soft delete — the record stays, but the trainer
                  cannot log in and will be hidden from clients.
                </p>
                <div className="admin-modal-actions">
                  <button className="btn-ghost" onClick={() => setConfirmRemove(false)} disabled={busy}>Cancel</button>
                  <button className="btn-danger" onClick={handleRemove} disabled={busy}>Confirm remove</button>
                </div>
              </div>
            )}

            {!rejectOpen && !confirmRemove && (
              <div className="admin-modal-actions">
                <button className="btn-ghost" onClick={onClose}>Close</button>
                {canRemove && (
                  <button className="btn-danger" onClick={() => setConfirmRemove(true)} disabled={busy}>
                    Remove
                  </button>
                )}
                {canReject && (
                  <button className="btn-warn" onClick={() => setRejectOpen(true)} disabled={busy}>
                    Reject
                  </button>
                )}
                {canApprove && (
                  <button className="btn-success" onClick={handleApprove} disabled={busy}>
                    Approve
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const DetailRow = ({ label, value }) => (
  <div className="detail-row">
    <span className="detail-label">{label}</span>
    <span className="detail-value">{value}</span>
  </div>
);

const DetailBlock = ({ label, value, tone }) => (
  <div className={`detail-block ${tone === 'warn' ? 'detail-block-warn' : ''}`}>
    <div className="detail-label">{label}</div>
    <div className="detail-value-block">{value || '—'}</div>
  </div>
);
