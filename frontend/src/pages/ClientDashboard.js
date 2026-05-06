import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './ClientArea.css';

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [trainers, setTrainers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [trainerReviews, setTrainerReviews] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [
        profileRes,
        usersRes,
        requestsRes,
        reviewsRes,
      ] = await Promise.all([
        api.get('/clients/me/profile/'),
        api.get('/users/all/'),
        api.get('/trainings/requests/'),
        api.get('/trainings/trainer-reviews/'),
      ]);

      setProfile(profileRes.data);

      const trainerUsers = usersRes.data.filter(
        (u) => u.role === 'trainer'
      );

      setTrainers(trainerUsers);
      setRequests(requestsRes.data);
      setTrainerReviews(reviewsRes.data);

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const onTrainerReviewSaved = (review) => {
    setTrainerReviews((cur) => {
      const idx = cur.findIndex((r) => r.id === review.id);
      if (idx >= 0) {
        const next = [...cur];
        next[idx] = review;
        return next;
      }
      return [...cur, review];
    });
  };

  const onTrainerReviewDeleted = (reviewId) => {
    setTrainerReviews((cur) => cur.filter((r) => r.id !== reviewId));
  };

  const sendRequest = async (trainerId) => {
    try {
      await api.post('/trainings/requests/', {
        trainer: trainerId,
      });

      loadData();

    } catch (err) {
      console.log(err);
      alert('Error sending request');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="client-shell">

      <nav className="client-nav">
        <div className="logo">
          <span className="logo-icon">LP</span>
          <span className="logo-text">LikeAPro</span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.6rem',
          }}
        >
          <Link
            to="/chat"
            className="client-logout"
          >
            Chat
          </Link>

          <Link
            to="/client/trainings"
            className="client-logout"
          >
            Trainings
          </Link>

          <button
            onClick={handleLogout}
            className="client-logout"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="client-main">

        <h1 className="client-greeting">
          Welcome back, {profile?.user?.first_name || user?.username}
        </h1>

        {loading ? (
          <div className="client-card client-card-skeleton" />
        ) : (
          <>
            <div className="client-summary">

              <ProfileSummary profile={profile} />

              <Link
                to="/client/profile"
                className="btn-secondary"
              >
                Edit Profile
              </Link>

            </div>

            <div
              style={{
                marginTop: '60px',
              }}
            >

              <h2
                style={{
                  color: '#ff6b00',
                  fontSize: '2.3rem',
                  marginBottom: '10px',
                }}
              >
                Choose Your Trainer
              </h2>

              <p
                style={{
                  color: '#888',
                  lineHeight: '1.8',
                  maxWidth: '800px',
                  marginBottom: '30px',
                  fontSize: '1rem',
                }}
              >
                Send a coaching request to a trainer you want to work with.
                Once accepted, your trainer will be able to create workout
                plans, training programs and guide your progress directly
                through the platform.
              </p>

              <div
                style={{
                  display: 'grid',
                  gap: '20px',
                }}
              >
                {trainers.map((trainer) => {

                  const existingRequest = requests.find(
                    (r) => r.trainer === trainer.id
                  );

                  const existingTrainerReview = trainerReviews.find(
                    (r) => r.trainer === trainer.id
                  );

                  const isConnected = existingRequest?.status === 'ACCEPTED';

                  return (
                    <div
                      key={trainer.id}
                      style={{
                        background: '#111',
                        border: '1px solid #222',
                        borderRadius: '18px',
                        padding: '28px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '18px',
                        transition: '0.2s',
                      }}
                    >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >

                      <div>

                        <h3
                          style={{
                            color: '#fff',
                            fontSize: '1.35rem',
                            marginBottom: '8px',
                          }}
                        >
                          {trainer.first_name} {trainer.last_name}
                        </h3>

                        <p
                          style={{
                            color: '#999',
                            marginBottom: '12px',
                          }}
                        >
                          @{trainer.username}
                        </p>

                        {!existingRequest && (
                          <div
                            style={{
                              color: '#777',
                              fontSize: '0.95rem',
                            }}
                          >
                            Available for online coaching
                          </div>
                        )}

                        {existingRequest?.status === 'PENDING' && (
                          <div
                            style={{
                              color: '#ffb347',
                              fontWeight: 'bold',
                              fontSize: '0.95rem',
                            }}
                          >
                            Waiting for trainer approval
                          </div>
                        )}

                        {existingRequest?.status === 'ACCEPTED' && (
                          <div
                            style={{
                              color: '#22c55e',
                              fontWeight: 'bold',
                              fontSize: '0.95rem',
                            }}
                          >
                            Connected trainer
                          </div>
                        )}

                        {existingRequest?.status === 'REJECTED' && (
                          <div
                            style={{
                              color: '#ef4444',
                              fontWeight: 'bold',
                              fontSize: '0.95rem',
                            }}
                          >
                            Request declined
                          </div>
                        )}

                      </div>

                      {!existingRequest && (
                        <button
                          onClick={() =>
                            sendRequest(trainer.id)
                          }
                          style={primaryButton}
                        >
                          Send Request
                        </button>
                      )}

                      {existingRequest?.status === 'PENDING' && (
                        <button
                          disabled
                          style={pendingButton}
                        >
                          Pending
                        </button>
                      )}

                      {existingRequest?.status === 'ACCEPTED' && (
                        <button
                          disabled
                          style={connectedButton}
                        >
                          Connected
                        </button>
                      )}

                      {existingRequest?.status === 'REJECTED' && (
                        <button
                          onClick={() =>
                            sendRequest(trainer.id)
                          }
                          style={primaryButton}
                        >
                          Send Again
                        </button>
                      )}

                    </div>

                    {isConnected && (
                      <TrainerReviewWidget
                        trainer={trainer}
                        review={existingTrainerReview}
                        onSaved={onTrainerReviewSaved}
                        onDeleted={onTrainerReviewDeleted}
                      />
                    )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}

function ProfileSummary({ profile }) {

  const goals =
    (profile.goals || []).map((g) => g.name).join(', ') || '—';

  const accessories =
    (profile.home_accessories || [])
      .map((a) => a.name)
      .join(', ') || '—';

  return (
    <div className="client-card">

      <h2>Your Profile</h2>

      <div className="summary-grid">

        <Cell
          label="Workout location"
          value={
            profile.workout_location === 'home'
              ? 'Home'
              : 'Gym'
          }
        />

        <Cell
          label="Sessions / week"
          value={profile.weekly_workouts}
        />

        <Cell
          label="Height"
          value={
            profile.height
              ? `${profile.height} cm`
              : '—'
          }
        />

        <Cell
          label="Weight"
          value={
            profile.weight
              ? `${profile.weight} kg`
              : '—'
          }
        />

        <Cell
          label="Circumference"
          value={
            profile.circumference
              ? `${profile.circumference} cm`
              : '—'
          }
        />

        <Cell
          label="Date of birth"
          value={profile.date_of_birth || '—'}
        />

      </div>

      <div className="summary-block">
        <span className="summary-label">
          Goals
        </span>

        <span className="summary-value">
          {goals}
        </span>
      </div>

      {profile.workout_location === 'home' && (
        <div className="summary-block">
          <span className="summary-label">
            Home accessories
          </span>

          <span className="summary-value">
            {accessories}
          </span>
        </div>
      )}

      {profile.health_status && (
        <div className="summary-block">
          <span className="summary-label">
            Health notes
          </span>

          <span className="summary-value">
            {profile.health_status}
          </span>
        </div>
      )}

    </div>
  );
}

function TrainerReviewWidget({ trainer, review, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review?.rating || 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(review?.comment || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    setRating(review?.rating || 0);
    setComment(review?.comment || '');
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setError('');
    setEditing(false);
  };

  const submit = async () => {
    if (rating < 1 || rating > 5) {
      setError('Please pick a rating between 1 and 5 stars.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let res;
      if (review) {
        res = await api.put(`/trainings/trainer-reviews/${review.id}/`, {
          trainer: trainer.id,
          rating,
          comment,
        });
      } else {
        res = await api.post('/trainings/trainer-reviews/', {
          trainer: trainer.id,
          rating,
          comment,
        });
      }
      onSaved(res.data);
      setEditing(false);
    } catch (err) {
      const data = err.response?.data;
      let msg;
      if (typeof data === 'string') msg = data;
      else if (data && typeof data === 'object') msg = data.detail || JSON.stringify(data);
      else msg = err.message || 'Failed to save review.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!review) return;
    if (!window.confirm('Delete your trainer review?')) return;

    setSaving(true);
    try {
      await api.delete(`/trainings/trainer-reviews/${review.id}/`);
      onDeleted(review.id);
    } catch {
      setError('Failed to delete review.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        paddingTop: '14px',
        borderTop: '1px solid #1f1f1f',
      }}
    >
      <h4
        style={{
          color: '#ff6b00',
          fontSize: '0.95rem',
          marginTop: 0,
          marginBottom: '8px',
        }}
      >
        Rate this trainer
      </h4>

      {!editing && review && (
        <div>
          <ReadStars value={review.rating} />
          {review.comment && (
            <p
              style={{
                color: '#ddd',
                marginTop: '8px',
                marginBottom: 0,
                fontSize: '0.95rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {review.comment}
            </p>
          )}
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button type="button" onClick={startEdit} style={smallBtn}>
              Edit
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={saving}
              style={{ ...smallBtn, background: '#222', color: '#bbb' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {!editing && !review && (
        <div>
          <p style={{ color: '#999', marginTop: 0, marginBottom: '10px' }}>
            You haven't rated this trainer yet.
          </p>
          <button type="button" onClick={startEdit} style={smallBtn}>
            Rate Trainer
          </button>
        </div>
      )}

      {editing && (
        <div>
          <InputStars
            value={rating}
            hoverValue={hover}
            onChange={setRating}
            onHover={setHover}
          />
          <textarea
            placeholder="Optional comment about your trainer"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              marginTop: '10px',
              background: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '10px',
              color: '#fff',
              padding: '10px 12px',
              fontSize: '0.95rem',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          {error && (
            <p style={{ color: '#ef4444', marginTop: '8px' }}>{error}</p>
          )}
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              style={smallBtn}
            >
              {saving ? 'Saving...' : (review ? 'Update' : 'Submit')}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              style={{ ...smallBtn, background: '#222', color: '#bbb' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadStars({ value }) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          style={{
            color: n <= value ? '#ff6b00' : '#333',
            fontSize: '1.2rem',
          }}
        >
          ★
        </span>
      ))}
      <span style={{ color: '#999', marginLeft: '8px', fontSize: '0.85rem' }}>
        {value}/5
      </span>
    </div>
  );
}

function InputStars({ value, hoverValue, onChange, onHover }) {
  const display = hoverValue || value;
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => onHover(n)}
          onMouseLeave={() => onHover(0)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: n <= display ? '#ff6b00' : '#333',
            fontSize: '1.5rem',
            padding: 0,
            lineHeight: 1,
          }}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      <span style={{ color: '#999', marginLeft: '8px', fontSize: '0.85rem' }}>
        {value ? `${value}/5` : 'Pick a rating'}
      </span>
    </div>
  );
}

const smallBtn = {
  padding: '8px 14px',
  borderRadius: '10px',
  border: 'none',
  background: '#ff6b00',
  color: '#fff',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '0.9rem',
};

const Cell = ({ label, value }) => (
  <div className="summary-cell">

    <span className="summary-label">
      {label}
    </span>

    <span className="summary-value">
      {value}
    </span>

  </div>
);

const primaryButton = {
  background: '#ff6b00',
  color: '#fff',
  border: 'none',
  padding: '13px 24px',
  borderRadius: '12px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '0.95rem',
};

const pendingButton = {
  background: '#3a2a12',
  color: '#ffb347',
  border: 'none',
  padding: '13px 24px',
  borderRadius: '12px',
  fontWeight: 'bold',
  fontSize: '0.95rem',
};

const connectedButton = {
  background: '#12351f',
  color: '#22c55e',
  border: 'none',
  padding: '13px 24px',
  borderRadius: '12px',
  fontWeight: 'bold',
  fontSize: '0.95rem',
};