import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

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
    setTrainings((cur) =>
      cur.map((t) => (t.id === updated.id ? updated : t))
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff',
      }}
    >
      <nav
        style={{
          height: '64px',
          borderBottom: '1px solid #1f1f1f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          background: '#0a0a0a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#ff6b00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '13px',
            }}
          >
            LP
          </div>
          <h2 style={{ margin: 0, fontSize: '16px' }}>LikeAPro</h2>
        </div>

        <Link
          to="/client"
          style={{
            background: '#ff6b00',
            color: '#fff',
            textDecoration: 'none',
            padding: '8px 16px',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          Back
        </Link>
      </nav>

      <div style={{ padding: '40px' }}>
        <h1
          style={{
            color: '#ff6b00',
            fontSize: '2.4rem',
            marginTop: 0,
            marginBottom: '8px',
          }}
        >
          My Trainings
        </h1>

        <p style={{ color: '#8d8d8d', fontSize: '1rem', marginBottom: '30px' }}>
          Trainings created by your trainer. Mark them as completed when done
          to leave ratings and feedback.
        </p>

        {loading ? (
          <h2>Loading...</h2>
        ) : trainings.length === 0 ? (
          <div
            style={{
              background: '#111',
              border: '1px solid #222',
              borderRadius: '18px',
              padding: '30px',
            }}
          >
            <h2 style={{ color: '#ff6b00', marginBottom: '8px', fontSize: '1.4rem' }}>
              No trainings yet
            </h2>
            <p style={{ color: '#999' }}>
              Your trainer has not assigned trainings yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '24px' }}>
            {trainings.map((training) => (
              <TrainingCard
                key={training.id}
                training={training}
                onUpdated={replaceTraining}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TrainingCard({ training, onUpdated }) {
  const [completing, setCompleting] = useState(false);

  const completed = !!training.completed_at;

  return (
    <div
      style={{
        background: '#111',
        border: '1px solid #222',
        borderRadius: '20px',
        padding: '26px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          marginBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ color: '#ff6b00', fontSize: '1.5rem', margin: 0 }}>
            {training.title}
          </h2>
          {training.description && (
            <p style={{ color: '#b0b0b0', marginTop: '8px', marginBottom: 0 }}>
              {training.description}
            </p>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          {completed ? (
            <div>
              <span
                style={{
                  background: '#12351f',
                  color: '#22c55e',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                }}
              >
                Completed
              </span>
              <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '6px' }}>
                {new Date(training.completed_at).toLocaleString()}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCompleting(true)}
              style={primaryBtn}
            >
              Mark as Completed
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
        {training.training_exercises.map((ex) => (
          <div
            key={ex.id}
            style={{
              background: '#1a1a1a',
              borderRadius: '14px',
              padding: '18px',
              border: '1px solid #2a2a2a',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1.15rem' }}>
              {ex.exercise_name}
            </h3>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <Stat label="Sets" value={ex.sets} />
              <Stat label="Reps" value={ex.reps} />
              <Stat label="Duration" value={`${ex.duration_minutes} min`} />
            </div>

            {ex.review && (
              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '1px solid #2a2a2a',
                }}
              >
                <Stars value={ex.review.rating} size="1.1rem" />
                {ex.review.comment && (
                  <p
                    style={{
                      color: '#ccc',
                      marginTop: '8px',
                      marginBottom: 0,
                      fontSize: '0.95rem',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {ex.review.comment}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {completed && training.review && (
        <div
          style={{
            marginTop: '20px',
            paddingTop: '18px',
            borderTop: '1px solid #222',
          }}
        >
          <h3 style={{ color: '#ff6b00', fontSize: '1.1rem', marginBottom: '10px' }}>
            Overall Review
          </h3>
          <Stars value={training.review.rating} size="1.3rem" />
          {training.review.feedback && (
            <p
              style={{
                color: '#ddd',
                marginTop: '10px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {training.review.feedback}
            </p>
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
    setExerciseRatings((cur) => ({
      ...cur,
      [teId]: { ...cur[teId], rating },
    }));

  const setExComment = (teId, comment) =>
    setExerciseRatings((cur) => ({
      ...cur,
      [teId]: { ...cur[teId], comment },
    }));

  const submit = async () => {
    if (overallRating < 1 || overallRating > 5) {
      setError('Please give an overall rating (1–5 stars).');
      return;
    }

    const exercise_reviews = training.training_exercises
      .map((ex) => ({
        training_exercise: ex.id,
        rating: exerciseRatings[ex.id].rating,
        comment: exerciseRatings[ex.id].comment,
      }))
      .filter((r) => r.rating > 0);

    const missing = training.training_exercises.find(
      (ex) => !exerciseRatings[ex.id].rating
    );
    if (missing) {
      setError(`Please rate every exercise (missing: ${missing.exercise_name}).`);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await api.post(
        `/trainings/trainings/${training.id}/complete/`,
        {
          rating: overallRating,
          feedback,
          exercise_reviews,
        }
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
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: '20px',
          padding: '28px',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          color: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
          }}
        >
          <h2 style={{ margin: 0, color: '#ff6b00', fontSize: '1.4rem' }}>
            Complete &amp; Rate: {training.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '1.6rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p style={{ color: '#999', marginTop: 0, marginBottom: '20px' }}>
          Rate each exercise from 1 to 5 stars and leave optional comments.
          Submitting will mark the training as completed.
        </p>

        <div style={{ display: 'grid', gap: '14px' }}>
          {training.training_exercises.map((ex) => (
            <div
              key={ex.id}
              style={{
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '14px',
                padding: '16px',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '1.05rem' }}>
                {ex.exercise_name}
                <span style={{ color: '#777', fontSize: '0.85rem', marginLeft: '10px' }}>
                  {ex.sets} × {ex.reps} · {ex.duration_minutes} min
                </span>
              </h3>

              <StarsInput
                value={exerciseRatings[ex.id].rating}
                hoverValue={hoverIds[ex.id] || 0}
                onChange={(n) => setExRating(ex.id, n)}
                onHover={(n) => setHoverIds((cur) => ({ ...cur, [ex.id]: n }))}
              />

              <textarea
                placeholder="Optional comment for this exercise"
                value={exerciseRatings[ex.id].comment}
                onChange={(e) => setExComment(ex.id, e.target.value)}
                rows={2}
                style={textareaStyle}
              />
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: '20px',
            paddingTop: '18px',
            borderTop: '1px solid #222',
          }}
        >
          <h3 style={{ color: '#ff6b00', marginTop: 0, marginBottom: '10px', fontSize: '1.1rem' }}>
            Overall Training Rating
          </h3>

          <StarsInput
            value={overallRating}
            hoverValue={overallHover}
            onChange={setOverallRating}
            onHover={setOverallHover}
            size="1.8rem"
          />

          <textarea
            placeholder="Overall feedback (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            style={{ ...textareaStyle, marginTop: '12px' }}
          />
        </div>

        {error && (
          <p style={{ color: '#ef4444', marginTop: '14px' }}>{error}</p>
        )}

        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{ ...primaryBtn, background: '#222', color: '#bbb' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            style={primaryBtn}
          >
            {saving ? 'Saving...' : 'Mark Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <span style={{ color: '#888', fontSize: '0.9rem' }}>{label}</span>
      <div style={{ marginTop: '4px', fontSize: '1.05rem', fontWeight: 'bold' }}>
        {value}
      </div>
    </div>
  );
}

function Stars({ value, size = '1.4rem' }) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          style={{ color: n <= value ? '#ff6b00' : '#333', fontSize: size }}
        >
          ★
        </span>
      ))}
      <span style={{ color: '#999', marginLeft: '8px', fontSize: '0.9rem' }}>
        {value}/5
      </span>
    </div>
  );
}

function StarsInput({ value, hoverValue, onChange, onHover, size = '1.6rem' }) {
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
            fontSize: size,
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

const primaryBtn = {
  background: '#ff6b00',
  color: '#fff',
  border: 'none',
  padding: '10px 18px',
  borderRadius: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '0.95rem',
};

const textareaStyle = {
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
};
