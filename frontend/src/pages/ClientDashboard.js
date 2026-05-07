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
  const [bookingTrainer, setBookingTrainer] = useState(null);

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

  const openBooking = (trainer) => {
    setBookingTrainer(trainer);
  };

  const finalizeBooking = async (trainerId) => {
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
                            onClick={() => openBooking(trainer)}
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
                            onClick={() => openBooking(trainer)}
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

      {bookingTrainer && (
        <BookTrainerModal
          trainer={bookingTrainer}
          onClose={() => setBookingTrainer(null)}
          onPaid={async () => {
            const t = bookingTrainer;
            setBookingTrainer(null);
            await finalizeBooking(t.id);
          }}
        />
      )}
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

const PRICE_PER_DAY = 10;

function BookTrainerModal({ trainer, onClose, onPaid }) {
  const [step, setStep] = useState('duration'); // duration | payment | success
  const [days, setDays] = useState(7);
  const [card, setCard] = useState({
    name: '',
    number: '',
    expiry: '',
    cvv: '',
  });
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);

  const total = (Number(days) || 0) * PRICE_PER_DAY;

  const validateDuration = () => {
    const n = Number(days);
    if (!Number.isInteger(n) || n < 1) return { days: 'Pick at least 1 day.' };
    if (n > 365) return { days: 'Maximum is 365 days.' };
    return {};
  };

  const goToPayment = () => {
    const errs = validateDuration();
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep('payment');
  };

  const handleCardChange = (key) => (e) => {
    let value = e.target.value;
    if (key === 'number') {
      value = value.replace(/\D/g, '').slice(0, 19);
      value = value.replace(/(.{4})/g, '$1 ').trim();
    } else if (key === 'expiry') {
      value = value.replace(/\D/g, '').slice(0, 4);
      if (value.length >= 3) value = `${value.slice(0, 2)}/${value.slice(2)}`;
    } else if (key === 'cvv') {
      value = value.replace(/\D/g, '').slice(0, 4);
    } else if (key === 'name') {
      value = value.replace(/[^A-Za-z\s'-]/g, '').slice(0, 60);
    }
    setCard((c) => ({ ...c, [key]: value }));
  };

  const validateCard = () => {
    const errs = {};
    const digits = card.number.replace(/\s+/g, '');
    if (!card.name.trim() || card.name.trim().length < 2) {
      errs.name = 'Cardholder name is required.';
    }
    if (digits.length < 13 || digits.length > 19) {
      errs.number = 'Enter a valid card number (13–19 digits).';
    } else if (!luhnCheck(digits)) {
      errs.number = 'Card number failed validation.';
    }

    const m = card.expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!m) {
      errs.expiry = 'Use MM/YY format.';
    } else {
      const month = Number(m[1]);
      const year = 2000 + Number(m[2]);
      if (month < 1 || month > 12) {
        errs.expiry = 'Month must be 01–12.';
      } else {
        const now = new Date();
        const exp = new Date(year, month, 0, 23, 59, 59);
        if (exp < now) errs.expiry = 'Card has expired.';
        if (year > now.getFullYear() + 20) errs.expiry = 'Year is too far ahead.';
      }
    }

    if (!/^\d{3,4}$/.test(card.cvv)) {
      errs.cvv = 'CVV must be 3 or 4 digits.';
    }
    return errs;
  };

  const submitPayment = (e) => {
    e.preventDefault();
    const errs = validateCard();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setStep('success');
    }, 800);
  };

  const trainerName =
    `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim() ||
    trainer.username;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {step === 'success' ? 'Payment received' : `Book ${trainerName}`}
          </h2>
          {step !== 'success' && (
            <button
              type="button"
              onClick={onClose}
              className="modal-close"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        {step === 'duration' && (
          <div>
            <p className="muted" style={{ margin: '0 0 1.2rem' }}>
              Choose for how many days you want to train with{' '}
              <strong style={{ color: '#fff' }}>{trainerName}</strong>.{' '}
              The price is <strong style={{ color: '#ff8a3d' }}>€{PRICE_PER_DAY} per day</strong>.
            </p>

            <label className="profile-field" style={{ marginBottom: 0 }}>
              <span className="profile-field-label">Duration (days)</span>
              <input
                type="number"
                min="1"
                max="365"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                style={cardInputStyle}
              />
              {errors.days && <span className="field-error">{errors.days}</span>}
            </label>

            <div
              style={{
                marginTop: '1.2rem',
                padding: '1rem 1.2rem',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #2a1500 0%, #1a0d00 100%)',
                border: '1px solid rgba(255,107,0,0.35)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#ddd' }}>Total to pay</span>
              <span style={{ color: '#ff8a3d', fontSize: '1.4rem', fontWeight: 700 }}>
                €{total}
              </span>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-ghost">
                Cancel
              </button>
              <button type="button" onClick={goToPayment} className="btn-orange">
                Continue to payment
              </button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <form onSubmit={submitPayment} noValidate>
            <p className="muted" style={{ margin: '0 0 1rem' }}>
              <strong style={{ color: '#fff' }}>{days} day{Number(days) === 1 ? '' : 's'}</strong>{' '}
              · Total <strong style={{ color: '#ff8a3d' }}>€{total}</strong>
            </p>

            <label className="profile-field">
              <span className="profile-field-label">Cardholder name</span>
              <input
                type="text"
                value={card.name}
                onChange={handleCardChange('name')}
                placeholder="As printed on the card"
                style={cardInputStyle}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>

            <label className="profile-field">
              <span className="profile-field-label">Card number</span>
              <input
                type="text"
                value={card.number}
                onChange={handleCardChange('number')}
                placeholder="1234 5678 9012 3456"
                inputMode="numeric"
                autoComplete="cc-number"
                style={{ ...cardInputStyle, letterSpacing: '0.05em' }}
              />
              {errors.number && <span className="field-error">{errors.number}</span>}
            </label>

            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="profile-field">
                <span className="profile-field-label">Expiry (MM/YY)</span>
                <input
                  type="text"
                  value={card.expiry}
                  onChange={handleCardChange('expiry')}
                  placeholder="08/29"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  style={cardInputStyle}
                />
                {errors.expiry && <span className="field-error">{errors.expiry}</span>}
              </label>

              <label className="profile-field">
                <span className="profile-field-label">CVV</span>
                <input
                  type="text"
                  value={card.cvv}
                  onChange={handleCardChange('cvv')}
                  placeholder="123"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  style={cardInputStyle}
                />
                {errors.cvv && <span className="field-error">{errors.cvv}</span>}
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setStep('duration')}
                disabled={processing}
                className="btn-ghost"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={processing}
                className="btn-orange"
              >
                {processing ? 'Processing…' : `Pay €${total}`}
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '0.5rem 0 0.8rem' }}>
            <div
              style={{
                width: 64,
                height: 64,
                margin: '0.4rem auto 1rem',
                borderRadius: '50%',
                background: 'rgba(34,197,94,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4ade80',
                fontSize: '2rem',
                fontWeight: 700,
              }}
            >
              ✓
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem' }}>
              Payment successful
            </h3>
            <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
              Your request is sent to your bank.
              <br />
              We'll send your coaching request to{' '}
              <strong style={{ color: '#fff' }}>{trainerName}</strong>.
            </p>

            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button type="button" onClick={onPaid} className="btn-orange">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function luhnCheck(digits) {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const cardInputStyle = {
  background: '#0a0a0a',
  border: '1px solid #232323',
  borderRadius: '10px',
  padding: '0.65rem 0.85rem',
  color: '#fff',
  fontSize: '0.95rem',
  fontFamily: 'inherit',
  outline: 'none',
};

const Cell = ({ label, value }) => (
  <div className="summary-cell">
    <span className="summary-label">{label}</span>
    <span className="summary-value">{value}</span>
  </div>
);
