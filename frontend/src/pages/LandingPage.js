import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './LandingPage.css';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('login');
  const [registerRole, setRegisterRole] = useState('client');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [clientData, setClientData] = useState({
    username: '', email: '', first_name: '', last_name: '', password: '', password2: ''
  });
  const [trainerData, setTrainerData] = useState({
    username: '', email: '', first_name: '', last_name: '',
    password: '', password2: '', license_number: '', specialty: '', biography: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const role = await login(loginData.username, loginData.password);
      navigate(`/${role}`);
    } catch {
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = registerRole === 'client' ? clientData : trainerData;
      const endpoint = registerRole === 'client'
        ? '/users/register/client/'
        : '/users/register/trainer/';
      await api.post(endpoint, data);
      setSuccess(
        registerRole === 'trainer'
          ? 'Registration successful! Wait for admin approval.'
          : 'Registration successful! You can now log in.'
      );
      setActiveTab('login');
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.values(data).flat().join(' ');
        setError(msgs);
      } else {
        setError('Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">LP</span>
          <span className="logo-text">LikeAPro</span>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Train Like A <span className="highlight">Pro</span>
          </h1>
          <p className="hero-subtitle">
            Connect with expert trainers, get personalized plans,<br />
            and track your progress — all in one place.
          </p>
          <div className="hero-stats">
            <div className="stat"><span className="stat-num">500+</span><span className="stat-label">Trainers</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-num">10k+</span><span className="stat-label">Clients</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-num">98%</span><span className="stat-label">Satisfaction</span></div>
          </div>
        </div>

        <div className="auth-card">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
            >
              Login
            </button>
            <button
              className={`tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => { setActiveTab('register'); setError(''); setSuccess(''); }}
            >
              Register
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={loginData.username}
                  onChange={e => setLoginData({ ...loginData, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          )}

          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="form">
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-btn ${registerRole === 'client' ? 'active' : ''}`}
                  onClick={() => setRegisterRole('client')}
                >
                  I'm a Client
                </button>
                <button
                  type="button"
                  className={`role-btn ${registerRole === 'trainer' ? 'active' : ''}`}
                  onClick={() => setRegisterRole('trainer')}
                >
                  I'm a Trainer
                </button>
              </div>

              {registerRole === 'client' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name</label>
                      <input type="text" placeholder="First name"
                        value={clientData.first_name}
                        onChange={e => setClientData({ ...clientData, first_name: e.target.value })}
                        required />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input type="text" placeholder="Last name"
                        value={clientData.last_name}
                        onChange={e => setClientData({ ...clientData, last_name: e.target.value })}
                        required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input type="text" placeholder="Choose a username"
                      value={clientData.username}
                      onChange={e => setClientData({ ...clientData, username: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" placeholder="your@email.com"
                      value={clientData.email}
                      onChange={e => setClientData({ ...clientData, email: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" placeholder="Create a password"
                      value={clientData.password}
                      onChange={e => setClientData({ ...clientData, password: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input type="password" placeholder="Repeat your password"
                      value={clientData.password2}
                      onChange={e => setClientData({ ...clientData, password2: e.target.value })}
                      required />
                  </div>
                </>
              )}

              {registerRole === 'trainer' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name</label>
                      <input type="text" placeholder="First name"
                        value={trainerData.first_name}
                        onChange={e => setTrainerData({ ...trainerData, first_name: e.target.value })}
                        required />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input type="text" placeholder="Last name"
                        value={trainerData.last_name}
                        onChange={e => setTrainerData({ ...trainerData, last_name: e.target.value })}
                        required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input type="text" placeholder="Choose a username"
                      value={trainerData.username}
                      onChange={e => setTrainerData({ ...trainerData, username: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" placeholder="your@email.com"
                      value={trainerData.email}
                      onChange={e => setTrainerData({ ...trainerData, email: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label>License Number</label>
                    <input type="text" placeholder="Your trainer license"
                      value={trainerData.license_number}
                      onChange={e => setTrainerData({ ...trainerData, license_number: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label>Specialty</label>
                    <input type="text" placeholder="e.g. Strength & Conditioning"
                      value={trainerData.specialty}
                      onChange={e => setTrainerData({ ...trainerData, specialty: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" placeholder="Create a password"
                      value={trainerData.password}
                      onChange={e => setTrainerData({ ...trainerData, password: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input type="password" placeholder="Repeat your password"
                      value={trainerData.password2}
                      onChange={e => setTrainerData({ ...trainerData, password2: e.target.value })}
                      required />
                  </div>
                </>
              )}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}