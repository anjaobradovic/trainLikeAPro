import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function CreateExercise() {
  const [form, setForm] = useState({
    name: '',
    note: '',
    video: '',
    equipment: '',
    accessory: '',
  });

  const [exercises, setExercises] = useState([]);

  const loadExercises = async () => {
    try {
      const res = await api.get('/trainings/exercises/');
      setExercises(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    loadExercises();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post('/trainings/exercises/', {
        ...form,
        equipment: form.equipment || null,
        accessory: form.accessory || null,
      });

      setForm({
        name: '',
        note: '',
        video: '',
        equipment: '',
        accessory: '',
      });

      loadExercises();

      alert('Exercise created!');
    } catch (err) {
      console.log(err.response?.data || err);
      alert('Error creating exercise');
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

      <div
        style={{
          padding: '40px',
        }}
      >
        <h1
          style={{
            color: '#ff6b00',
            fontSize: '3rem',
            marginTop: 0,
            marginBottom: '30px',
          }}
        >
          Create Exercise
        </h1>

        <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          maxWidth: '600px',
        }}
      >
        <input
          placeholder="Exercise name"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
          style={inputStyle}
          required
        />

        <textarea
          placeholder="Exercise note"
          value={form.note}
          onChange={(e) =>
            setForm({ ...form, note: e.target.value })
          }
          style={{
            ...inputStyle,
            minHeight: '120px',
          }}
          required
        />

        <input
          placeholder="Video URL"
          value={form.video}
          onChange={(e) =>
            setForm({ ...form, video: e.target.value })
          }
          style={inputStyle}
        />

        <button style={buttonStyle}>
          Create Exercise
        </button>
      </form>

      <div style={{ marginTop: '60px' }}>
        <h2
          style={{
            color: '#ff6b00',
            marginBottom: '20px',
          }}
        >
          My Exercises
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              style={{
                background: '#111',
                padding: '20px',
                borderRadius: '14px',
                border: '1px solid #222',
              }}
            >
              <h3
                style={{
                  marginBottom: '10px',
                  color: '#fff',
                }}
              >
                {exercise.name}
              </h3>

              <p
                style={{
                  color: '#aaa',
                  lineHeight: '1.6',
                }}
              >
                {exercise.note}
              </p>

              {exercise.video && (
                <a
                  href={exercise.video}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: '#ff6b00',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                  }}
                >
                  Watch Exercise Video
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '14px',
  borderRadius: '10px',
  border: '1px solid #333',
  background: '#111',
  color: '#fff',
  fontSize: '1rem',
};

const buttonStyle = {
  padding: '15px',
  border: 'none',
  borderRadius: '10px',
  background: '#ff6b00',
  color: '#fff',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '1rem',
};