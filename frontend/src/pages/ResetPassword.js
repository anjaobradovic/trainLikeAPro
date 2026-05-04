import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import './LandingPage.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

export default function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ---------- Step 1: submit email ----------

  const handleRequest = async (ev) => {
    ev.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setErrors({ email: 'Enter a valid email address.' });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await api.post('/auth/password-reset/request/', { email: email.trim() });
      toast.success(`We sent a 6-digit code to ${email}.`);
      setStep(2);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 404) {
        setErrors({ email: detail || 'This email is not registered.' });
      } else if (err.response?.data?.email) {
        const v = err.response.data.email;
        setErrors({ email: Array.isArray(v) ? v.join(' ') : String(v) });
      } else {
        setErrors({ general: detail || 'Something went wrong. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Step 2: enter code + new password ----------

  const validateStep2 = () => {
    const e = {};
    if (!CODE_RE.test(code.trim())) e.code = 'Code must be 6 digits.';
    if (!password || password.length < 6) {
      e.new_password = 'Password must be at least 6 characters.';
    } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      e.new_password = 'Password must contain letters and numbers.';
    }
    if (password !== confirm) e.confirm = 'Passwords do not match.';
    return e;
  };

  const handleConfirm = async (ev) => {
    ev.preventDefault();
    const v = validateStep2();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await api.post('/auth/password-reset/confirm/', {
        email: email.trim(),
        code: code.trim(),
        new_password: password,
      });
      toast.success('Password updated. You can log in with your new password.');
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const fe = {};
        Object.entries(data).forEach(([k, val]) => {
          fe[k] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setErrors(fe);
        if (fe.detail) toast.error(fe.detail);
      } else {
        toast.error('Reset failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderError = (field) =>
    errors[field] ? <span className="field-error">{errors[field]}</span> : null;

  // ---------- Render ----------

  return (
    <div className="landing">
      <nav className="navbar">
        <Link to="/" className="logo">
          <span className="logo-icon">LP</span>
          <span className="logo-text">LikeAPro</span>
        </Link>
      </nav>

      <div className="reset-wrap">
        <div className="auth-card reset-card">
          {step === 1 ? (
            <>
              <h1 className="reset-title">Forgot your password?</h1>
              <p className="reset-sub">
                Enter your email. If it's registered we'll send a 6-digit code there.
              </p>

              {errors.general && <div className="alert alert-error">{errors.general}</div>}

              <form onSubmit={handleRequest} className="form" noValidate>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                  {renderError('email')}
                </div>

                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send code'}
                </button>

                <Link to="/" className="reset-back">Back to login</Link>
              </form>
            </>
          ) : (
            <>
              <h1 className="reset-title">Enter the code</h1>
              <p className="reset-sub">
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below
                along with your new password.
              </p>

              {errors.detail && <div className="alert alert-error">{errors.detail}</div>}

              <form onSubmit={handleConfirm} className="form" noValidate>
                <div className="form-group">
                  <label>6-digit code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                  {renderError('code')}
                </div>
                <div className="form-group">
                  <label>New password</label>
                  <input
                    type="password"
                    placeholder="6+ chars, letters & numbers"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {renderError('new_password')}
                </div>
                <div className="form-group">
                  <label>Confirm new password</label>
                  <input
                    type="password"
                    placeholder="Repeat your new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                  {renderError('confirm')}
                </div>

                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Update password'}
                </button>

                <button
                  type="button"
                  className="reset-back reset-back-btn"
                  onClick={() => { setStep(1); setErrors({}); setCode(''); setPassword(''); setConfirm(''); }}
                >
                  ← Use a different email
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
