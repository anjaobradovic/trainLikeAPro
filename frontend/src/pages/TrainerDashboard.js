import { useAuth } from '../context/AuthContext';

export default function TrainerDashboard() {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: '2rem', color: '#fff' }}>
      <h1 style={{ color: '#ff6b00' }}>Trainer Dashboard</h1>
      <p>Welcome, {user?.username}!</p>
      <button onClick={logout} style={{ marginTop: '1rem', padding: '0.5rem 1rem',
        background: '#ff6b00', border: 'none', color: '#fff', borderRadius: '8px', cursor: '    pointer' }}>
        Logout
      </button>
    </div>
  );
}