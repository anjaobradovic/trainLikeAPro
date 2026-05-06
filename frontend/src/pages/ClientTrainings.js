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

  const handleReviewSaved = (trainingId, review) => {
    setTrainings((cur) =>
      cur.map((t) => (t.id === trainingId ? { ...t, review } : t))
    );
  };

  const handleReviewDeleted = (trainingId) => {
    setTrainings((cur) =>
      cur.map((t) => (t.id === trainingId ? { ...t, review: null } : t))
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
          height: '90px',
          borderBottom: '1px solid #1f1f1f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          background: '#0d0d0d',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#ff6b00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#fff',
            }}
          >
            LP
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: '2rem',
            }}
          >
            LikeAPro
          </h2>
        </div>

        <Link
          to="/client"
          style={{
            padding: '12px 22px',
            borderRadius: '14px',
            background: '#ff6b00',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          Back
        </Link>
      </nav>

      <div
        style={{
          padding: '50px',
        }}
      >
        <h1
          style={{
            color: '#ff6b00',
            fontSize: '4rem',
            marginBottom: '10px',
          }}
        >
          My Trainings
        </h1>

        <p
          style={{
            color: '#8d8d8d',
            fontSize: '1.4rem',
            marginBottom: '50px',
          }}
        >
          Trainings created by your trainer.
        </p>

        {loading ? (
          <h2>Loading...</h2>
        ) : trainings.length === 0 ? (
          <div
            style={{
              background: '#111',
              border: '1px solid #222',
              borderRadius: '22px',
              padding: '40px',
            }}
          >
            <h2
              style={{
                color: '#ff6b00',
                marginBottom: '10px',
              }}
            >
              No trainings yet
            </h2>

            <p
              style={{
                color: '#999',
              }}
            >
              Your trainer has not assigned trainings yet.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '30px',
            }}
          >
            {trainings.map((training) => (
              <div
                key={training.id}
                style={{
                  background: '#111',
                  border: '1px solid #222',
                  borderRadius: '24px',
                  padding: '35px',
                }}
              >
                <div
                  style={{
                    marginBottom: '25px',
                  }}
                >
                  <h2
                    style={{
                      color: '#ff6b00',
                      fontSize: '2rem',
                      marginBottom: '10px',
                    }}
                  >
                    {training.title}
                  </h2>

                  <p
                    style={{
                      color: '#b0b0b0',
                      fontSize: '1.1rem',
                    }}
                  >
                    {training.description}
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: '20px',
                  }}
                >
                  {training.training_exercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      style={{
                        background: '#1a1a1a',
                        borderRadius: '18px',
                        padding: '22px',
                        border: '1px solid #2a2a2a',
                      }}
                    >
                      <h3
                        style={{
                          marginBottom: '15px',
                          fontSize: '1.5rem',
                        }}
                      >
                        {exercise.exercise_name}
                      </h3>

                      <div
                        style={{
                          display: 'flex',
                          gap: '30px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <span style={labelStyle}>
                            Sets
                          </span>

                          <div style={valueStyle}>
                            {exercise.sets}
                          </div>
                        </div>

                        <div>
                          <span style={labelStyle}>
                            Reps
                          </span>

                          <div style={valueStyle}>
                            {exercise.reps}
                          </div>
                        </div>

                        <div>
                          <span style={labelStyle}>
                            Duration
                          </span>

                          <div style={valueStyle}>
                            {exercise.duration_minutes} min
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <ReviewSection
                  training={training}
                  onSaved={(review) => handleReviewSaved(training.id, review)}
                  onDeleted={() => handleReviewDeleted(training.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewSection({ training, onSaved, onDeleted }) {
  const review = training.review;
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState(review?.feedback || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    setRating(review?.rating || 0);
    setFeedback(review?.feedback || '');
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const submit = async () => {
    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5 stars.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let res;
      if (review) {
        res = await api.put(`/trainings/reviews/${review.id}/`, {
          training: training.id,
          rating,
          feedback,
        });
      } else {
        res = await api.post('/trainings/reviews/', {
          training: training.id,
          rating,
          feedback,
        });
      }
      onSaved(res.data);
      setEditing(false);
    } catch (err) {
      const msg = err.response?.data?.detail
        || (err.response?.data && JSON.stringify(err.response.data))
        || 'Failed to save review.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!review) return;
    if (!window.confirm('Delete your review?')) return;

    setSaving(true);
    try {
      await api.delete(`/trainings/reviews/${review.id}/`);
      onDeleted();
    } catch (err) {
      setError('Failed to delete review.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        marginTop: '30px',
        paddingTop: '25px',
        borderTop: '1px solid #222',
      }}
    >
      <h3
        style={{
          color: '#ff6b00',
          fontSize: '1.4rem',
          marginBottom: '15px',
        }}
      >
        Your Review
      </h3>

      {!editing && review && (
        <div>
          <Stars value={review.rating} />

          {review.feedback && (
            <p
              style={{
                color: '#ddd',
                marginTop: '12px',
                fontSize: '1.05rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {review.feedback}
            </p>
          )}

          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={startEdit}
              style={smallBtnStyle}
            >
              Edit
            </button>

            <button
              type="button"
              onClick={remove}
              disabled={saving}
              style={{ ...smallBtnStyle, background: '#222', color: '#bbb' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {!editing && !review && (
        <div>
          <p style={{ color: '#999', marginBottom: '12px' }}>
            You haven't reviewed this training yet.
          </p>
          <button
            type="button"
            onClick={startEdit}
            style={smallBtnStyle}
          >
            Write a review
          </button>
        </div>
      )}

      {editing && (
        <div>
          <StarsInput
            value={rating}
            hoverValue={hoverRating}
            onChange={setRating}
            onHover={setHoverRating}
          />

          <textarea
            placeholder="Share your feedback (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              marginTop: '15px',
              background: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '14px',
              color: '#fff',
              padding: '14px',
              fontSize: '1rem',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />

          {error && (
            <p style={{ color: '#ef4444', marginTop: '10px' }}>{error}</p>
          )}

          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              style={smallBtnStyle}
            >
              {saving ? 'Saving...' : (review ? 'Update' : 'Submit')}
            </button>

            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              style={{ ...smallBtnStyle, background: '#222', color: '#bbb' }}
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
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          style={{
            color: n <= value ? '#ff6b00' : '#333',
            fontSize: '1.6rem',
          }}
        >
          ★
        </span>
      ))}
      <span style={{ color: '#999', marginLeft: '10px' }}>{value}/5</span>
    </div>
  );
}

function StarsInput({ value, hoverValue, onChange, onHover }) {
  const display = hoverValue || value;
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
            fontSize: '2rem',
            padding: 0,
            lineHeight: 1,
          }}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      <span style={{ color: '#999', marginLeft: '10px' }}>
        {value ? `${value}/5` : 'Pick a rating'}
      </span>
    </div>
  );
}

const labelStyle = {
  color: '#888',
  fontSize: '0.95rem',
};

const valueStyle = {
  marginTop: '6px',
  fontSize: '1.2rem',
  fontWeight: 'bold',
};

const smallBtnStyle = {
  padding: '10px 18px',
  borderRadius: '12px',
  border: 'none',
  background: '#ff6b00',
  color: '#fff',
  fontWeight: 'bold',
  cursor: 'pointer',
};
