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
              </div>
            ))}
          </div>
        )}
      </div>
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