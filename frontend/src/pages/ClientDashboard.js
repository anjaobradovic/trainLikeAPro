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

  useEffect(() => {
    let cancelled = false;
    api.get('/clients/me/profile/')
      .then((res) => { if (!cancelled) setProfile(res.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="client-shell">
      <nav className="client-nav">
        <div className="logo">
          <span className="logo-icon">LP</span>
          <span className="logo-text">LikeAPro</span>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <Link to="/chat" className="client-logout">Chat</Link>
          <button onClick={handleLogout} className="client-logout">Logout</button>
        </div>
      </nav>

      <main className="client-main">
        <h1 className="client-greeting">
          Hello, dear {profile?.user?.first_name || user?.username}
        </h1>

        {loading ? (
          <div className="client-card client-card-skeleton" />
        ) : !profile?.is_complete ? (
          <div className="client-card client-onboard">
            <h2>Finish your profile before you start</h2>
            <p>
              We need a few details about you to recommend training plans, match you
              with a trainer, and track your progress.
            </p>
            <Link to="/client/profile" className="btn-primary">Complete profile</Link>
          </div>
        ) : (
          <div className="client-summary">
            <ProfileSummary profile={profile} />
            <Link to="/client/profile" className="btn-secondary">Edit profile</Link>
          </div>
        )}
      </main>
    </div>
  );
}

function ProfileSummary({ profile }) {
  const goals = profile.goals.map((g) => g.name).join(', ') || '—';
  const accessories = profile.home_accessories.map((a) => a.name).join(', ') || '—';
  return (
    <div className="client-card">
      <h2>Your profile</h2>
      <div className="summary-grid">
        <Cell label="Workout location" value={profile.workout_location === 'home' ? 'Home' : 'Gym'} />
        <Cell label="Sessions / week" value={profile.weekly_workouts} />
        <Cell label="Height" value={profile.height ? `${profile.height} cm` : '—'} />
        <Cell label="Weight" value={profile.weight ? `${profile.weight} kg` : '—'} />
        <Cell label="Circumference" value={profile.circumference ? `${profile.circumference} cm` : '—'} />
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

const Cell = ({ label, value }) => (
  <div className="summary-cell">
    <span className="summary-label">{label}</span>
    <span className="summary-value">{value}</span>
  </div>
);
