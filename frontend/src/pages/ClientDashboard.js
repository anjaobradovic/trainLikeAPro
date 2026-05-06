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

      if (profileRes.data && profileRes.data.is_complete === false) {
        navigate('/client/profile?onboard=1', { replace: true });
        return;
      }

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

  const sendRequest = async (trainerId) => {
    try {
      await api.post('/trainings/requests/', { trainer: trainerId });
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

  return (
    <div className="client-shell">
      <nav className="client-nav">
        <div className="logo">
          <span className="logo-icon">LP</span>
          <span className="logo-text">LikeAPro</span>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <Link to="/chat" className="client-logout">Chat</Link>
          <Link to="/client/trainings" className="client-logout">Trainings</Link>
          <button onClick={handleLogout} className="client-logout">Logout</button>
        </div>
      </nav>

      <main className="client-main">
        <h1 className="client-greeting">
          Welcome back, {profile?.user?.first_name || user?.username}
        </h1>
        <p className="client-sub">
          Track your progress, chat with your trainer, and rate your sessions.
        </p>

        {loading ? (
          <div className="client-card client-card-skeleton" />
        ) : (
          <>
            <div className="client-summary">
              <ProfileSummary profile={profile} />
              <Link to="/client/profile" className="btn-ghost">
                Edit Profile
              </Link>
            </div>

            <div className="section-header">
              <h2 className="section-title">Choose Your Trainer</h2>
              <p className="section-subtitle">
                Send a coaching request to a trainer you want to work with.
                Once accepted, your trainer will create workout plans and guide
                your progress through the platform.
              </p>
            </div>

            <div className="cards-grid">
              {trainers.map((trainer) => {
                const existingRequest = requests.find(
                  (r) => r.trainer === trainer.id
                );

                const existingTrainerReview = trainerReviews.find(
                  (r) => r.trainer === trainer.id
                );

                const isConnected = existingRequest?.status === 'ACCEPTED';

                return (
                  <div key={trainer.id} className="trainer-card">
                    <div className="trainer-card-row">
                      <div className="trainer-identity">
                        <div className="trainer-avatar">
                          {(trainer.first_name?.[0] || trainer.username?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <h3 className="trainer-name">
                            {trainer.first_name} {trainer.last_name}
                          </h3>
                          <div className="trainer-handle">@{trainer.username}</div>

                          {!existingRequest && (
                            <div className="trainer-status-line">
                              Available for online coaching
                            </div>
                          )}
                          {existingRequest?.status === 'PENDING' && (
                            <div className="trainer-status-line warn">
                              Waiting for trainer approval
                            </div>
                          )}
                          {existingRequest?.status === 'ACCEPTED' && (
                            <div className="trainer-status-line good">
                              Connected trainer
                            </div>
                          )}
                          {existingRequest?.status === 'REJECTED' && (
                            <div className="trainer-status-line danger">
                              Request declined
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        {!existingRequest && (
                          <button
                            onClick={() => sendRequest(trainer.id)}
                            className="btn-orange"
                          >
                            Send Request
                          </button>
                        )}
                        {existingRequest?.status === 'PENDING' && (
                          <span className="pill pill-warn">
                            <span className="pill-dot" />
                            Pending
                          </span>
                        )}
                        {existingRequest?.status === 'ACCEPTED' && (
                          <span className="pill pill-good">
                            <span className="pill-dot" />
                            Connected
                          </span>
                        )}
                        {existingRequest?.status === 'REJECTED' && (
                          <button
                            onClick={() => sendRequest(trainer.id)}
                            className="btn-orange"
                          >
                            Send Again
                          </button>
                        )}
                      </div>
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
    <div className="client-card" style={{ width: '100%' }}>
      <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.25rem', letterSpacing: '-0.01em' }}>
        Your Profile
      </h2>
      <p className="muted" style={{ margin: '0 0 1.1rem' }}>
        These details help your trainer tailor your sessions.
      </p>

      <div className="summary-grid">
        <Cell
          label="Workout location"
          value={profile.workout_location === 'home' ? 'Home' : 'Gym'}
        />
        <Cell label="Sessions / week" value={profile.weekly_workouts} />
        <Cell
          label="Height"
          value={profile.height ? `${profile.height} cm` : '—'}
        />
        <Cell
          label="Weight"
          value={profile.weight ? `${profile.weight} kg` : '—'}
        />
        <Cell
          label="Circumference"
          value={profile.circumference ? `${profile.circumference} cm` : '—'}
        />
        <Cell label="Date of birth" value={profile.date_of_birth || '—'} />
      </div>

      <div className="summary-block">
        <span className="summary-label">Goals</span>
        <span className="summary-value">{goals}</span>
      </div>

      {profile.workout_location === 'home' && (
        <div className="summary-block">
          <span className="summary-label">Home accessories</span>
          <span className="summary-value">{accessories}</span>
        </div>
      )}

      {profile.health_status && (
        <div className="summary-block">
          <span className="summary-label">Health notes</span>
          <span className="summary-value">{profile.health_status}</span>
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
    <div className="card-divider">
      <p className="eyebrow">Rate your trainer</p>

      {!editing && review && (
        <div>
          <Stars value={review.rating} />
          {review.comment && (
            <p className="review-comment">{review.comment}</p>
          )}
          <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={startEdit} className="btn-pill">Edit</button>
            <button
              type="button"
              onClick={remove}
              disabled={saving}
              className="btn-ghost"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {!editing && !review && (
        <div>
          <p className="muted" style={{ margin: '0 0 0.7rem' }}>
            You haven't rated this trainer yet.
          </p>
          <button type="button" onClick={startEdit} className="btn-pill">
            Rate Trainer
          </button>
        </div>
      )}

      {editing && (
        <div>
          <StarsInput
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
            className="field-textarea"
          />
          {error && <p className="error-text">{error}</p>}
          <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="btn-orange"
            >
              {saving ? 'Saving…' : (review ? 'Update review' : 'Submit review')}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stars({ value }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`star ${n <= value ? 'filled' : ''}`}>★</span>
      ))}
      <span className="stars-text">{value}/5</span>
    </div>
  );
}

function StarsInput({ value, hoverValue, onChange, onHover }) {
  const display = hoverValue || value;
  return (
    <div className="stars-input">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => onHover(n)}
          onMouseLeave={() => onHover(0)}
          className={n <= display ? 'filled' : ''}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      <span className="stars-text">
        {value ? `${value}/5` : 'Pick a rating'}
      </span>
    </div>
  );
}

const Cell = ({ label, value }) => (
  <div className="summary-cell">
    <span className="summary-label">{label}</span>
    <span className="summary-value">{value}</span>
  </div>
);
