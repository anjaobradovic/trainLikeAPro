import { useAuth } from '../context/AuthContext';

export default function ClientDashboard() {
  const { logout } = useAuth();
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      color: '#fff',
    }}>
      <h1 style={{ color: '#ff6b00', fontSize: '3rem', margin: 0 }}>Hello Dear Client</h1>
      <button onClick={logout} style={{
        padding: '0.7rem 1.5rem',
        background: '#ff6b00',
        border: 'none',
        color: '#fff',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 600,
      }}>
        Logout
      </button>
    </div>
  );
}
