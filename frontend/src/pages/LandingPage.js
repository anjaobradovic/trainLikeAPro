import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './LandingPage.css';

const USERNAME_RE = /^[A-Za-z0-9_.@+-]{3,150}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[A-Za-zÀ-ž' -]{2,50}$/;

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('login');
  const [registerRole, setRegisterRole] = useState('client');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [clientData, setClientData] = useState({
    username: '', email: '', first_name: '', last_name: '', password: '', password2: ''
  });
  const [trainerData, setTrainerData] = useState({
    username: '', email: '', first_name: '', last_name: '',
    password: '', password2: '', license_number: '', specialty: '', biography: '',
    date_of_birth: '', gender: '',
  });

  const resetMessages = () => {
    setError('');
    setFieldErrors({});
  };

  const validateRegister = (data, role) => {
    const errs = {};
    if (!NAME_RE.test(data.first_name.trim())) {
      errs.first_name = 'First name must be 2–50 letters.';
    }
    if (!NAME_RE.test(data.last_name.trim())) {
      errs.last_name = 'Last name must be 2–50 letters.';
    }
    if (!USERNAME_RE.test(data.username.trim())) {
      errs.username = 'Username must be 3+ chars (letters, digits, _.@+-).';
    }
    if (!EMAIL_RE.test(data.email.trim())) {
      errs.email = 'Enter a valid email address.';
    }
    if (!data.password || data.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    } else if (!/[A-Za-z]/.test(data.password) || !/[0-9]/.test(data.password)) {
      errs.password = 'Password must contain letters and numbers.';
    }
    if (data.password !== data.password2) {
      errs.password2 = 'Passwords do not match.';
    }
    if (role === 'trainer') {
      if (!data.license_number.trim()) {
        errs.license_number = 'License number is required.';
      }
      if (!data.gender) {
        errs.gender = 'Please select a gender.';
      }
      if (!data.biography || data.biography.trim().length < 20) {
        errs.biography = 'Biography must be at least 20 characters.';
      }
      if (!data.date_of_birth) {
        errs.date_of_birth = 'Date of birth is required.';
      } else {
        const dob = new Date(data.date_of_birth);
        const today = new Date();
        if (Number.isNaN(dob.getTime()) || dob > today) {
          errs.date_of_birth = 'Enter a valid date of birth.';
        } else {
          let age = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
          if (age < 21) errs.date_of_birth = 'Trainer must be at least 21 years old.';
        }
      }
    }
    return errs;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    const errs = {};
    if (!loginData.username.trim()) errs.username = 'Username is required.';
    if (!loginData.password) errs.password = 'Password is required.';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const role = await login(loginData.username.trim(), loginData.password);
      navigate(`/${role}`);
    } catch {
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    resetMessages();
    const data = registerRole === 'client' ? clientData : trainerData;
    const errs = validateRegister(data, registerRole);
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const endpoint = registerRole === 'client'
        ? '/users/register/client/'
        : '/users/register/trainer/';
      await api.post(endpoint, data);
      setShowSuccess(true);
    } catch (err) {
      const respData = err.response?.data;
      if (respData && typeof respData === 'object') {
        const apiFieldErrs = {};
        Object.entries(respData).forEach(([key, val]) => {
          apiFieldErrs[key] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setFieldErrors(apiFieldErrs);
        setError('Please fix the errors below.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setActiveTab('login');
    setClientData({ username: '', email: '', first_name: '', last_name: '', password: '', password2: '' });
    setTrainerData({
      username: '', email: '', first_name: '', last_name: '',
      password: '', password2: '', license_number: '', specialty: '', biography: '',
      date_of_birth: '', gender: '',
    });
  };

  const renderError = (field) =>
    fieldErrors[field] ? <span className="field-error">{fieldErrors[field]}</span> : null;

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
              onClick={() => { setActiveTab('login'); resetMessages(); }}
            >
              Login
            </button>
            <button
              className={`tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => { setActiveTab('register'); resetMessages(); }}
            >
              Register
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="form" noValidate>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={loginData.username}
                  onChange={e => setLoginData({ ...loginData, username: e.target.value })}
                />
                {renderError('username')}
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                />
                {renderError('password')}
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
              <Link to="/reset-password" className="forgot-link">Forgot password?</Link>
            </form>
          )}

          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="form" noValidate>
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-btn ${registerRole === 'client' ? 'active' : ''}`}
                  onClick={() => { setRegisterRole('client'); resetMessages(); }}
                >
                  I'm a Client
                </button>
                <button
                  type="button"
                  className={`role-btn ${registerRole === 'trainer' ? 'active' : ''}`}
                  onClick={() => { setRegisterRole('trainer'); resetMessages(); }}
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
                        onChange={e => setClientData({ ...clientData, first_name: e.target.value })} />
                      {renderError('first_name')}
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input type="text" placeholder="Last name"
                        value={clientData.last_name}
                        onChange={e => setClientData({ ...clientData, last_name: e.target.value })} />
                      {renderError('last_name')}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input type="text" placeholder="Choose a username"
                      value={clientData.username}
                      onChange={e => setClientData({ ...clientData, username: e.target.value })} />
                    {renderError('username')}
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" placeholder="your@email.com"
                      value={clientData.email}
                      onChange={e => setClientData({ ...clientData, email: e.target.value })} />
                    {renderError('email')}
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" placeholder="Create a password (6+ chars, letters & numbers)"
                      value={clientData.password}
                      onChange={e => setClientData({ ...clientData, password: e.target.value })} />
                    {renderError('password')}
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input type="password" placeholder="Repeat your password"
                      value={clientData.password2}
                      onChange={e => setClientData({ ...clientData, password2: e.target.value })} />
                    {renderError('password2')}
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
                        onChange={e => setTrainerData({ ...trainerData, first_name: e.target.value })} />
                      {renderError('first_name')}
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input type="text" placeholder="Last name"
                        value={trainerData.last_name}
                        onChange={e => setTrainerData({ ...trainerData, last_name: e.target.value })} />
                      {renderError('last_name')}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input type="text" placeholder="Choose a username"
                      value={trainerData.username}
                      onChange={e => setTrainerData({ ...trainerData, username: e.target.value })} />
                    {renderError('username')}
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" placeholder="your@email.com"
                      value={trainerData.email}
                      onChange={e => setTrainerData({ ...trainerData, email: e.target.value })} />
                    {renderError('email')}
                  </div>
                  <div className="form-group">
                    <label>License Number</label>
                    <input type="text" placeholder="Your trainer license"
                      value={trainerData.license_number}
                      onChange={e => setTrainerData({ ...trainerData, license_number: e.target.value })} />
                    {renderError('license_number')}
                  </div>
                  <div className="form-group">
                    <label>Specialty</label>
                    <input type="text" placeholder="e.g. Strength & Conditioning"
                      value={trainerData.specialty}
                      onChange={e => setTrainerData({ ...trainerData, specialty: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date of birth</label>
                      <input type="date" max={new Date().toISOString().slice(0, 10)}
                        value={trainerData.date_of_birth}
                        onChange={e => setTrainerData({ ...trainerData, date_of_birth: e.target.value })} />
                      {renderError('date_of_birth')}
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select
                        value={trainerData.gender}
                        onChange={e => setTrainerData({ ...trainerData, gender: e.target.value })}
                      >
                        <option value="">Select…</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                      {renderError('gender')}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Biography</label>
                    <textarea
                      rows={3}
                      placeholder="Tell us about your coaching experience (20+ characters)"
                      value={trainerData.biography}
                      onChange={e => setTrainerData({ ...trainerData, biography: e.target.value })}
                    />
                    {renderError('biography')}
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" placeholder="Create a password (6+ chars, letters & numbers)"
                      value={trainerData.password}
                      onChange={e => setTrainerData({ ...trainerData, password: e.target.value })} />
                    {renderError('password')}
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input type="password" placeholder="Repeat your password"
                      value={trainerData.password2}
                      onChange={e => setTrainerData({ ...trainerData, password2: e.target.value })} />
                    {renderError('password2')}
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

      {showSuccess && (
        <div className="modal-overlay" onClick={handleSuccessClose}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">✓</div>
            <h2 className="modal-title">Congratulations!</h2>
            <p className="modal-text">Your account has been created. You can log in now.</p>
            <button className="btn-primary" onClick={handleSuccessClose}>
              Continue to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
