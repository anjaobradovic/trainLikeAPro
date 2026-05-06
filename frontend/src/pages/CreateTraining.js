import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function CreateTraining() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [client, setClient] = useState('');

  const [clients, setClients] = useState([]);
  const [availableExercises, setAvailableExercises] = useState([]);

  const [exercises, setExercises] = useState([
    {
      exercise: '',
      sets: '',
      reps: '',
      duration_minutes: '',
      order: 1,
    },
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClients();
    loadExercises();
  }, []);

  const loadClients = async () => {
    try {
      const res = await api.get('/trainings/requests/');

      const acceptedClients = res.data
        .filter((r) => r.status === 'ACCEPTED')
        .map((r) => ({
          id: r.client,
          name:
            r.client_detail?.full_name ||
            r.client_detail?.username ||
            `Client #${r.client}`,
        }));

      setClients(acceptedClients);
    } catch (err) {
      console.log(err);
    }
  };

  const loadExercises = async () => {
    try {
      const res = await api.get('/trainings/exercises/');
      setAvailableExercises(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleExerciseChange = (index, field, value) => {
    const updated = [...exercises];

    updated[index][field] = value;

    setExercises(updated);
  };

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        exercise: '',
        sets: '',
        reps: '',
        duration_minutes: '',
        order: exercises.length + 1,
      },
    ]);
  };

  const removeExercise = (index) => {
    const updated = exercises.filter((_, i) => i !== index);

    const reordered = updated.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    setExercises(reordered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!client) {
      alert('Please select a client.');
      return;
    }

    const cleanedExercises = exercises.map((item) => ({
      exercise: Number(item.exercise),
      sets: Number(item.sets),
      reps: Number(item.reps),
      duration_minutes: Number(item.duration_minutes),
    }));

    const invalid = cleanedExercises.find(
      (ex) =>
        !ex.exercise ||
        Number.isNaN(ex.sets) ||
        Number.isNaN(ex.reps) ||
        Number.isNaN(ex.duration_minutes)
    );
    if (invalid) {
      alert('Please fill in every exercise field (exercise, sets, reps, minutes).');
      return;
    }

    try {
      setLoading(true);

      await api.post(
        '/trainings/trainings/',
        {
          title,
          description,
          client: Number(client),
          exercises: cleanedExercises,
        }
      );

      alert('Training created successfully!');

      navigate('/trainer/my-trainings');

    } catch (err) {
      console.log(err.response?.data || err);

      const data = err.response?.data;
      let msg;
      if (typeof data === 'string') {
        msg = data;
      } else if (data && typeof data === 'object') {
        msg = data.detail || JSON.stringify(data);
      } else {
        msg = err.message || 'Unknown error';
      }
      alert(`Error creating training:\n${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050505',
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
          padding: '28px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            color: '#ff6b00',
            fontSize: '28px',
            marginBottom: '6px',
          }}
        >
          Create Training
        </h1>

        <p
          style={{
            color: '#888',
            fontSize: '14px',
            marginBottom: '24px',
          }}
        >
          Build personalized workout plans for your clients.
        </p>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr',
              gap: '20px',
              alignItems: 'start',
            }}
          >
            <div
              style={{
                background: '#0b0b0b',
                border: '1px solid #1f1f1f',
                borderRadius: '16px',
                padding: '20px',
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: '18px',
                  fontSize: '16px',
                }}
              >
                Training Details
              </h2>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <input
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  style={inputStyle}
                />

                <textarea
                  placeholder="Description"
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  style={{
                    ...inputStyle,
                    height: 'auto',
                    minHeight: '90px',
                    padding: '10px 14px',
                    resize: 'vertical',
                  }}
                />

                <select
                  value={client}
                  onChange={(e) =>
                    setClient(e.target.value)
                  }
                  required
                  style={inputStyle}
                >
                  <option value="">
                    Select a client
                  </option>

                  {clients.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={addExercise}
                  style={{
                    width: 'fit-content',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '10px',
                    background: '#ff6b00',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  + Add Exercise
                </button>
              </div>
            </div>

            <div
              style={{
                background: '#0b0b0b',
                border: '1px solid #1f1f1f',
                borderRadius: '16px',
                padding: '20px',
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: '18px',
                  fontSize: '16px',
                }}
              >
                Summary
              </h2>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <SummaryItem
                  label="Total Exercises"
                  value={exercises.length}
                />

                <SummaryItem
                  label="Selected Client"
                  value={
                    clients.find((c) => String(c.id) === String(client))?.name
                      || 'None'
                  }
                />

                <SummaryItem
                  label="Status"
                  value="Ready"
                  green
                />
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {exercises.map((exercise, index) => (
              <div
                key={index}
                style={{
                  background: '#0b0b0b',
                  border: '1px solid #1f1f1f',
                  borderRadius: '14px',
                  padding: '18px',
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
                  <h2
                    style={{
                      margin: 0,
                      color: '#ff6b00',
                      fontSize: '15px',
                    }}
                  >
                    Exercise #{index + 1}
                  </h2>

                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removeExercise(index)
                      }
                      style={{
                        background: '#222',
                        border: 'none',
                        color: '#999',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12px',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <select
                    value={exercise.exercise}
                    onChange={(e) =>
                      handleExerciseChange(
                        index,
                        'exercise',
                        e.target.value
                      )
                    }
                    required
                    style={inputStyle}
                  >
                    <option value="">
                      Select an exercise
                    </option>

                    {availableExercises.map((ex) => (
                      <option
                        key={ex.id}
                        value={ex.id}
                      >
                        {ex.name}
                      </option>
                    ))}
                  </select>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        '1fr 1fr 1fr',
                      gap: '10px',
                    }}
                  >
                    <input
                      type="number"
                      placeholder="Sets"
                      value={exercise.sets}
                      onChange={(e) =>
                        handleExerciseChange(
                          index,
                          'sets',
                          e.target.value
                        )
                      }
                      required
                      style={inputStyle}
                    />

                    <input
                      type="number"
                      placeholder="Reps"
                      value={exercise.reps}
                      onChange={(e) =>
                        handleExerciseChange(
                          index,
                          'reps',
                          e.target.value
                        )
                      }
                      required
                      style={inputStyle}
                    />

                    <input
                      type="number"
                      placeholder="Minutes"
                      value={
                        exercise.duration_minutes
                      }
                      onChange={(e) =>
                        handleExerciseChange(
                          index,
                          'duration_minutes',
                          e.target.value
                        )
                      }
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '20px',
              height: '46px',
              border: 'none',
              borderRadius: '12px',
              background: '#ff6b00',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? 'Creating Training...'
              : 'Create Training'}
          </button>
        </form>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  green,
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        borderBottom: '1px solid #1f1f1f',
        paddingBottom: '10px',
      }}
    >
      <span
        style={{
          color: '#777',
          fontSize: '13px',
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: green ? '#22c55e' : '#fff',
          fontWeight: 'bold',
          fontSize: '13px',
        }}
      >
        {value}
      </span>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  height: '40px',
  borderRadius: '10px',
  border: '1px solid #1f1f1f',
  background: '#050505',
  color: '#fff',
  padding: '0 12px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};