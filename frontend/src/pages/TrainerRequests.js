import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import './TrainerArea.css';

export default function TrainerRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await api.get('/trainings/requests/');
      setRequests(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const updateRequest = async (id, status) => {
    try {
      await api.patch(`/trainings/requests/${id}/`, { status });

      setRequests((prev) =>
        prev.map((request) =>
          request.id === id ? { ...request, status } : request
        )
      );
    } catch (err) {
      console.log(err);
      alert('Error updating request');
    }
  };

  return (
    <div className="trainer-shell">
      <nav className="trainer-nav">
        <div className="trainer-logo">
          <div className="trainer-logo-mark">LP</div>
          <span className="trainer-logo-text">LikeAPro</span>
        </div>

        <Link to="/trainer" className="trainer-btn trainer-btn-ghost">
          ← Back
        </Link>
      </nav>

      <main className="trainer-main">
        <div className="trainer-page-header">
          <div>
            <h1>Client Requests</h1>
            <p>Review incoming clients and accept the ones you want to coach.</p>
          </div>
        </div>

        {loading ? (
          <div className="trainer-loading">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="trainer-empty">No pending requests yet.</div>
        ) : (
          <div className="request-list">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onUpdate={updateRequest}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function RequestCard({ request, onUpdate }) {
  const client = request.client_detail || {};
  const name = client.full_name || `Client #${request.client}`;
  const initials = getInitials(name);

  const statusClass = request.status.toLowerCase();

  return (
    <div className="request-card">
      <div className="request-head">
        <div className="request-identity">
          <div className="request-avatar">{initials}</div>
          <div>
            <h2 className="request-name">{name}</h2>
            <p className="request-username">
              {client.username && `@${client.username}`}
              {client.email && ` · ${client.email}`}
            </p>
          </div>
        </div>

        <div className={`request-status ${statusClass}`}>
          {request.status}
        </div>
      </div>

      {client.full_name && (
        <>
          <div className="request-stats">
            <Stat label="Age" value={client.age ? `${client.age} yrs` : '—'} />
            <Stat label="Gender" value={client.gender_display || '—'} />
            <Stat
              label="Height"
              value={client.height ? `${client.height} cm` : '—'}
            />
            <Stat
              label="Weight"
              value={client.weight ? `${client.weight} kg` : '—'}
            />
            <Stat
              label="Waist"
              value={
                client.circumference ? `${client.circumference} cm` : '—'
              }
            />
            <Stat
              label="Workouts / week"
              value={client.weekly_workouts ?? '—'}
            />
            <Stat
              label="Workout location"
              value={client.workout_location_display || '—'}
            />
          </div>

          <div className="request-tags">
            <TagRow label="Goals" items={client.goals} />
            <TagRow
              label="Home accessories"
              items={client.home_accessories}
              muted
            />
          </div>

          {client.description && (
            <div className="request-bio">
              <strong>About:</strong> {client.description}
            </div>
          )}

          {client.health_status && (
            <div className="request-bio">
              <strong>Health notes:</strong> {client.health_status}
            </div>
          )}
        </>
      )}

      {request.status === 'PENDING' && (
        <div className="request-actions">
          <button
            onClick={() => onUpdate(request.id, 'ACCEPTED')}
            className="trainer-btn trainer-btn-primary"
          >
            Accept client
          </button>
          <button
            onClick={() => onUpdate(request.id, 'REJECTED')}
            className="trainer-btn trainer-btn-danger"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat-cell">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function TagRow({ label, items, muted }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <span className="tag-row-label">{label}</span>
      <div className="tag-row" style={{ marginTop: 6 }}>
        {items.map((item) => (
          <span
            key={item.id}
            className={`tag-pill ${muted ? 'muted' : ''}`}
          >
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
