import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import './ClientArea.css';

export default function ClientTrainings() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrainings();
  }, []);

  const loadTrainings = async () => {
    try {
      const res = await api.get('/trainings/trainings/');
      setTrainings(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const replaceTraining = (updated) => {
    setTrainings((cur) => cur.map((t) => (t.id === updated.id ? updated : t)));
  };

  return (
    <div className="client-shell">
      <nav className="client-nav">
        <Link to="/client" className="logo">
          <span className="logo-icon">LP</span>
          <span className="logo-text">LikeAPro</span>
        </Link>
        <Link to="/client" className="client-logout">Back to dashboard</Link>
      </nav>

      <main className="client-main">
        <h1 className="client-greeting">My Trainings</h1>
        <p className="client-sub">
          Trainings created by your trainer. Mark them as completed when you're
          done to leave per-exercise ratings and overall feedback.
        </p>

        {loading ? (
          <div className="client-card client-card-skeleton" />
        ) : trainings.length === 0 ? (
          <div className="empty-state">
            <h3>No trainings yet</h3>
            <p>Your trainer has not assigned trainings yet.</p>
          </div>
        ) : (
          <div className="cards-grid" style={{ gap: '1.25rem' }}>
            {trainings.map((training) => (
              <TrainingCard
                key={training.id}
                training={training}
                onUpdated={replaceTraining}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TrainingCard({ training, onUpdated }) {
  const [completing, setCompleting] = useState(false);
  const completed = !!training.completed_at;

  return (
    <div className="training-card">
      <div className="training-card-header">
        <div>
          <h2 className="training-title">{training.title}</h2>
          {training.description && (
            <p className="training-description">{training.description}</p>
          )}
        </div>

        <div className="training-meta-right">
          {completed ? (
            <>
              <span className="pill pill-good">
                <span className="pill-dot" />
                Completed
              </span>
              <span className="muted" style={{ fontSize: '0.82rem' }}>
                {new Date(training.completed_at).toLocaleString()}
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setCompleting(true)}
              className="btn-orange"
            >
              Mark as Completed
            </button>
          )}
        </div>
      </div>

      <div className="exercise-list">
        {training.training_exercises.map((ex) => (
          <div key={ex.id} className="exercise-card">
            <h3 className="exercise-card-title">
              {ex.exercise_name}
            </h3>

            <div className="exercise-stats">
              <Stat label="Sets" value={ex.sets} />
              <Stat label="Reps" value={ex.reps} />
              <Stat label="Duration" value={`${ex.duration_minutes} min`} />
            </div>

            {ex.review && (
              <div className="card-divider" style={{ marginTop: '0.9rem' }}>
                <Stars value={ex.review.rating} />
                {ex.review.comment && (
                  <p className="review-comment">{ex.review.comment}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {completed && training.review && (
        <div className="card-divider">
          <p className="eyebrow">Overall review</p>
          <Stars value={training.review.rating} />
          {training.review.feedback && (
            <p className="review-comment">{training.review.feedback}</p>
          )}
        </div>
      )}

      {completing && (
        <CompleteModal
          training={training}
          onClose={() => setCompleting(false)}
          onCompleted={(updated) => {
            onUpdated(updated);
            setCompleting(false);
          }}
        />
      )}
    </div>
  );
}

function CompleteModal({ training, onClose, onCompleted }) {
  const [overallRating, setOverallRating] = useState(0);
  const [overallHover, setOverallHover] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [exerciseRatings, setExerciseRatings] = useState(() =>
    Object.fromEntries(
      training.training_exercises.map((ex) => [ex.id, { rating: 0, comment: '' }])
    )
  );
  const [hoverIds, setHoverIds] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setExRating = (teId, rating) =>
    setExerciseRatings((cur) => ({ ...cur, [teId]: { ...cur[teId], rating } }));

  const setExComment = (teId, comment) =>
    setExerciseRatings((cur) => ({ ...cur, [teId]: { ...cur[teId], comment } }));

  const submit = async () => {
    if (overallRating < 1 || overallRating > 5) {
      setError('Please give an overall rating (1–5 stars).');
      return;
    }

    const missing = training.training_exercises.find(
      (ex) => !exerciseRatings[ex.id].rating
    );
    if (missing) {
      setError(`Please rate every exercise (missing: ${missing.exercise_name}).`);
      return;
    }

    const exercise_reviews = training.training_exercises.map((ex) => ({
      training_exercise: ex.id,
      rating: exerciseRatings[ex.id].rating,
      comment: exerciseRatings[ex.id].comment,
    }));

    setSaving(true);
    setError('');

    try {
      const res = await api.post(
        `/trainings/trainings/${training.id}/complete/`,
        { rating: overallRating, feedback, exercise_reviews }
      );
      onCompleted(res.data);
    } catch (err) {
      const data = err.response?.data;
      let msg;
      if (typeof data === 'string') msg = data;
      else if (data && typeof data === 'object') msg = data.detail || JSON.stringify(data);
      else msg = err.message || 'Failed to complete training.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            Complete &amp; Rate · {training.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="muted" style={{ margin: '0 0 1.2rem' }}>
          Rate each exercise from 1 to 5 stars and leave optional comments.
          Submitting marks the training as completed.
        </p>

        <div style={{ display: 'grid', gap: '0.85rem' }}>
          {training.training_exercises.map((ex) => (
            <div key={ex.id} className="exercise-card">
              <h3 className="exercise-card-title">
                {ex.exercise_name}
                <span className="exercise-card-meta">
                  {ex.sets} × {ex.reps} · {ex.duration_minutes} min
                </span>
              </h3>

              <StarsInput
                value={exerciseRatings[ex.id].rating}
                hoverValue={hoverIds[ex.id] || 0}
                onChange={(n) => setExRating(ex.id, n)}
                onHover={(n) =>
                  setHoverIds((cur) => ({ ...cur, [ex.id]: n }))
                }
              />

              <textarea
                placeholder="Optional comment for this exercise"
                value={exerciseRatings[ex.id].comment}
                onChange={(e) => setExComment(ex.id, e.target.value)}
                rows={2}
                className="field-textarea"
              />
            </div>
          ))}
        </div>

        <div className="card-divider">
          <p className="eyebrow">Overall training rating</p>
          <StarsInput
            value={overallRating}
            hoverValue={overallHover}
            onChange={setOverallRating}
            onHover={setOverallHover}
          />
          <textarea
            placeholder="Overall feedback (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            className="field-textarea"
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="btn-orange"
          >
            {saving ? 'Saving…' : 'Mark Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <span className="exercise-stat-label">{label}</span>
      <div className="exercise-stat-value">{value}</div>
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
