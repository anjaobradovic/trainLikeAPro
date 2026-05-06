import { useEffect, useState } from 'react';
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
        padding: '40px',
      }}
    >
      <h1
        style={{
          color: '#ff6b00',
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
            <h2
              style={{
                color: '#ff6b00',
                marginBottom: '10px',
              }}
            >
              {training.title}
            </h2>

            <p
              style={{
                color: '#aaa',
                marginBottom: '25px',
              }}
            >
              {training.description}
            </p>

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
                </div>
              ))}
            </div>

            <ClientReview review={training.review} />
          </div>
        ))}
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
