import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './TrainerArea.css';

export default function TrainerDashboard() {
  const { logout, user } = useAuth();

  return (
    <div className="trainer-shell">
      <nav className="trainer-nav">
        <div className="trainer-logo">
          <div className="trainer-logo-mark">LP</div>
          <span className="trainer-logo-text">LikeAPro</span>
        </div>

        <div className="trainer-nav-actions">
          <Link to="/chat" className="trainer-btn trainer-btn-ghost">
            Chat
          </Link>
          <button
            onClick={logout}
            className="trainer-btn trainer-btn-primary"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="trainer-main">
        <div className="trainer-page-header">
          <div>
            <h1>Trainer Dashboard</h1>
            <p>Welcome back, {user?.username} — manage your clients and trainings.</p>
          </div>
        </div>

        <div className="trainer-grid">
          <Link to="/trainer/requests" className="trainer-card">
            <div className="trainer-card-icon">📥</div>
            <h2>Client Requests</h2>
            <p>Review pending requests and accept the clients you want to work with.</p>
          </Link>

          <Link to="/trainer/exercises" className="trainer-card">
            <div className="trainer-card-icon">🏋️</div>
            <h2>Create Exercises</h2>
            <p>Build a library of exercises with notes, equipment and video.</p>
          </Link>

          <Link to="/trainer/trainings" className="trainer-card">
            <div className="trainer-card-icon">📋</div>
            <h2>Create Trainings</h2>
            <p>Combine exercises into structured workouts for each client.</p>
          </Link>

          <Link to="/trainer/my-trainings" className="trainer-card">
            <div className="trainer-card-icon">📊</div>
            <h2>Assigned Trainings</h2>
            <p>See every training you have created and assigned so far.</p>
          </Link>

          <Link to="/chat" className="trainer-card">
            <div className="trainer-card-icon">💬</div>
            <h2>Chat</h2>
            <p>Communicate directly with your clients in real time.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
