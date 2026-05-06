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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [
        profileRes,
        usersRes,
        requestsRes
      ] = await Promise.all([
        api.get('/clients/me/profile/'),
        api.get('/users/all/'),
        api.get('/trainings/requests/')
      ]);

      setProfile(profileRes.data);

      const trainerUsers = usersRes.data.filter(
        (u) => u.role === 'trainer'
      );

      setTrainers(trainerUsers);
      setRequests(requestsRes.data);

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (trainerId) => {
    try {
      await api.post('/trainings/requests/', {
        trainer: trainerId,
      });

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

  return (
    <div className="client-shell">

      <nav className="client-nav">
        <div className="logo">
          <span className="logo-icon">LP</span>
          <span className="logo-text">LikeAPro</span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.6rem',
          }}
        >
          <Link
            to="/chat"
            className="client-logout"
          >
            Chat
          </Link>

          <Link
            to="/client/trainings"
            className="client-logout"
          >
            Trainings
          </Link>

          <button
            onClick={handleLogout}
            className="client-logout"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="client-main">

        <h1 className="client-greeting">
          Welcome back, {profile?.user?.first_name || user?.username}
        </h1>

        {loading ? (
          <div className="client-card client-card-skeleton" />
        ) : (
          <>
            <div className="client-summary">

              <ProfileSummary profile={profile} />

              <Link
                to="/client/profile"
                className="btn-secondary"
              >
                Edit Profile
              </Link>

            </div>

            <div
              style={{
                marginTop: '60px',
              }}
            >

              <h2
                style={{
                  color: '#ff6b00',
                  fontSize: '2.3rem',
                  marginBottom: '10px',
                }}
              >
                Choose Your Trainer
              </h2>

              <p
                style={{
                  color: '#888',
                  lineHeight: '1.8',
                  maxWidth: '800px',
                  marginBottom: '30px',
                  fontSize: '1rem',
                }}
              >
                Send a coaching request to a trainer you want to work with.
                Once accepted, your trainer will be able to create workout
                plans, training programs and guide your progress directly
                through the platform.
              </p>

              <div
                style={{
                  display: 'grid',
                  gap: '20px',
                }}
              >
                {trainers.map((trainer) => {

                  const existingRequest = requests.find(
                    (r) => r.trainer === trainer.id
                  );

                  return (
                    <div
                      key={trainer.id}
                      style={{
                        background: '#111',
                        border: '1px solid #222',
                        borderRadius: '18px',
                        padding: '28px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: '0.2s',
                      }}
                    >

                      <div>

                        <h3
                          style={{
                            color: '#fff',
                            fontSize: '1.35rem',
                            marginBottom: '8px',
                          }}
                        >
                          {trainer.first_name} {trainer.last_name}
                        </h3>

                        <p
                          style={{
                            color: '#999',
                            marginBottom: '12px',
                          }}
                        >
                          @{trainer.username}
                        </p>

                        {!existingRequest && (
                          <div
                            style={{
                              color: '#777',
                              fontSize: '0.95rem',
                            }}
                          >
                            Available for online coaching
                          </div>
                        )}

                        {existingRequest?.status === 'PENDING' && (
                          <div
                            style={{
                              color: '#ffb347',
                              fontWeight: 'bold',
                              fontSize: '0.95rem',
                            }}
                          >
                            Waiting for trainer approval
                          </div>
                        )}

                        {existingRequest?.status === 'ACCEPTED' && (
                          <div
                            style={{
                              color: '#22c55e',
                              fontWeight: 'bold',
                              fontSize: '0.95rem',
                            }}
                          >
                            Connected trainer
                          </div>
                        )}

                        {existingRequest?.status === 'REJECTED' && (
                          <div
                            style={{
                              color: '#ef4444',
                              fontWeight: 'bold',
                              fontSize: '0.95rem',
                            }}
                          >
                            Request declined
                          </div>
                        )}

                      </div>

                      {!existingRequest && (
                        <button
                          onClick={() =>
                            sendRequest(trainer.id)
                          }
                          style={primaryButton}
                        >
                          Send Request
                        </button>
                      )}

                      {existingRequest?.status === 'PENDING' && (
                        <button
                          disabled
                          style={pendingButton}
                        >
                          Pending
                        </button>
                      )}

                      {existingRequest?.status === 'ACCEPTED' && (
                        <button
                          disabled
                          style={connectedButton}
                        >
                          Connected
                        </button>
                      )}

                      {existingRequest?.status === 'REJECTED' && (
                        <button
                          onClick={() =>
                            sendRequest(trainer.id)
                          }
                          style={primaryButton}
                        >
                          Send Again
                        </button>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}

function ProfileSummary({ profile }) {

  const goals =
    profile.goals.map((g) => g.name).join(', ') || '—';

  const accessories =
    profile.home_accessories
      .map((a) => a.name)
      .join(', ') || '—';

  return (
    <div className="client-card">

      <h2>Your Profile</h2>

      <div className="summary-grid">

        <Cell
          label="Workout location"
          value={
            profile.workout_location === 'home'
              ? 'Home'
              : 'Gym'
          }
        />

        <Cell
          label="Sessions / week"
          value={profile.weekly_workouts}
        />

        <Cell
          label="Height"
          value={
            profile.height
              ? `${profile.height} cm`
              : '—'
          }
        />

        <Cell
          label="Weight"
          value={
            profile.weight
              ? `${profile.weight} kg`
              : '—'
          }
        />

        <Cell
          label="Circumference"
          value={
            profile.circumference
              ? `${profile.circumference} cm`
              : '—'
          }
        />

        <Cell
          label="Date of birth"
          value={profile.date_of_birth || '—'}
        />

      </div>

      <div className="summary-block">
        <span className="summary-label">
          Goals
        </span>

        <span className="summary-value">
          {goals}
        </span>
      </div>

      {profile.workout_location === 'home' && (
        <div className="summary-block">
          <span className="summary-label">
            Home accessories
          </span>

          <span className="summary-value">
            {accessories}
          </span>
        </div>
      )}

      {profile.health_status && (
        <div className="summary-block">
          <span className="summary-label">
            Health notes
          </span>

          <span className="summary-value">
            {profile.health_status}
          </span>
        </div>
      )}

    </div>
  );
}

const Cell = ({ label, value }) => (
  <div className="summary-cell">

    <span className="summary-label">
      {label}
    </span>

    <span className="summary-value">
      {value}
    </span>

  </div>
);

const primaryButton = {
  background: '#ff6b00',
  color: '#fff',
  border: 'none',
  padding: '13px 24px',
  borderRadius: '12px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '0.95rem',
};

const pendingButton = {
  background: '#3a2a12',
  color: '#ffb347',
  border: 'none',
  padding: '13px 24px',
  borderRadius: '12px',
  fontWeight: 'bold',
  fontSize: '0.95rem',
};

const connectedButton = {
  background: '#12351f',
  color: '#22c55e',
  border: 'none',
  padding: '13px 24px',
  borderRadius: '12px',
  fontWeight: 'bold',
  fontSize: '0.95rem',
};