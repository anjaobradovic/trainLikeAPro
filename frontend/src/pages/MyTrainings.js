import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function MyTrainings() {
  const [trainings, setTrainings] = useState([]);

  useEffect(() => {
    loadTrainings();
  }, []);

  const loadTrainings = async () => {
    try {
      const res = await api.get('/trainings/trainings/');
      setTrainings(res.data);
    } catch (err) {
      console.log(err);
    }
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
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

          <h2
            style={{
              margin: 0,
              fontSize: '16px',
            }}
          >
            LikeAPro
          </h2>
        </div>

        <Link
          to="/trainer"
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
            marginTop: 0,
            marginBottom: '40px',
          }}
        >
          My Trainings
        </h1>

        <div
          style={{
            display: 'grid',
            gap: '25px',
          }}
        >
        {trainings.map((training) => (
          <div
            key={training.id}
            style={{
              background: '#111',
              border: '1px solid #222',
              borderRadius: '16px',
              padding: '25px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '15px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 style={{ color: '#ff6b00', margin: 0 }}>
                  {training.title}
                </h2>
                {training.description && (
                  <p style={{ color: '#aaa', marginTop: '8px', marginBottom: 0 }}>
                    {training.description}
                  </p>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                {training.completed_at ? (
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
                  <span
                    style={{
                      background: '#3a2a12',
                      color: '#ffb347',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                    }}
                  >
                    In progress
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gap: '15px',
              }}
            >
              {training.training_exercises.map((exercise) => (
                <div
                  key={exercise.id}
                  style={{
                    background: '#1a1a1a',
                    padding: '18px',
                    borderRadius: '12px',
                  }}
                >
                  <h3
                    style={{
                      marginBottom: '10px',
                    }}
                  >
                    {exercise.exercise_name}
                  </h3>

                  <p style={{ color: '#bbb' }}>
                    Sets: {exercise.sets}
                  </p>

                  <p style={{ color: '#bbb' }}>
                    Reps: {exercise.reps}
                  </p>

                  <p style={{ color: '#bbb' }}>
                    Duration: {exercise.duration_minutes} min
                  </p>

                  {exercise.review && (
                    <div
                      style={{
                        marginTop: '12px',
                        paddingTop: '10px',
                        borderTop: '1px solid #2a2a2a',
                      }}
                    >
                      <Stars value={exercise.review.rating} />
                      {exercise.review.comment && (
                        <p
                          style={{
                            color: '#ddd',
                            marginTop: '8px',
                            marginBottom: 0,
                            fontSize: '0.95rem',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {exercise.review.comment}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <ClientReview review={training.review} />
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}

function ClientReview({ review }) {
  return (
    <div
      style={{
        marginTop: '25px',
        paddingTop: '20px',
        borderTop: '1px solid #222',
      }}
    >
      <h3
        style={{
          color: '#ff6b00',
          marginBottom: '12px',
          fontSize: '1.2rem',
        }}
      >
        Client Review
      </h3>

      {review ? (
        <div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                style={{
                  color: n <= review.rating ? '#ff6b00' : '#333',
                  fontSize: '1.4rem',
                }}
              >
                ★
              </span>
            ))}
            <span style={{ color: '#999', marginLeft: '10px' }}>
              {review.rating}/5
            </span>
            {review.client_name && (
              <span style={{ color: '#666', marginLeft: '12px', fontSize: '0.95rem' }}>
                — {review.client_name}
              </span>
            )}
          </div>

          {review.feedback && (
            <p
              style={{
                color: '#ddd',
                marginTop: '10px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {review.feedback}
            </p>
          )}
        </div>
      ) : (
        <p style={{ color: '#888' }}>No review yet.</p>
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
            fontSize: '1.1rem',
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
