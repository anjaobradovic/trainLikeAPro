import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TrainerDashboard() {
  const { logout, user } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff',
        padding: '40px',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '50px',
          }}
        >
          <div>
            <h1
              style={{
                color: '#ff6b00',
                margin: 0,
                fontSize: '3rem',
              }}
            >
              Trainer Dashboard
            </h1>

            <p
              style={{
                color: '#999',
                marginTop: '10px',
              }}
            >
              Welcome, {user?.username}
            </p>
          </div>

          <button
            onClick={logout}
            style={{
              padding: '12px 24px',
              background: '#ff6b00',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Logout
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '25px',
          }}
        >
          <Link
            to="/trainer/requests"
            style={cardStyle}
          >
            <h2 style={titleStyle}>Client Requests</h2>
            <p style={textStyle}>
              Accept or reject client requests.
            </p>
          </Link>

          <Link
            to="/trainer/exercises"
            style={cardStyle}
          >
            <h2 style={titleStyle}>Create Exercises</h2>
            <p style={textStyle}>
              Add exercises with video and descriptions.
            </p>
          </Link>

          <Link
            to="/trainer/trainings"
            style={cardStyle}
          >
            <h2 style={titleStyle}>Create Trainings</h2>
            <p style={textStyle}>
              Build workout plans for clients.
            </p>
          </Link>

          <Link
            to="/trainer/my-trainings"
            style={cardStyle}
          >
            <h2 style={titleStyle}>Assigned Trainings</h2>
            <p style={textStyle}>
              View all created and assigned trainings.
            </p>
          </Link>

          <Link
            to="/chat"
            style={cardStyle}
          >
            <h2 style={titleStyle}>Chat</h2>
            <p style={textStyle}>
              Communicate with your clients.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: '#111',
  border: '1px solid #222',
  borderRadius: '16px',
  padding: '30px',
  textDecoration: 'none',
  color: '#fff',
  transition: '0.2s',
};

const titleStyle = {
  color: '#ff6b00',
  marginBottom: '15px',
};

const textStyle = {
  color: '#aaa',
  lineHeight: '1.6',
};