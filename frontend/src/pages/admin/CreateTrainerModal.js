import { useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const today = () => new Date().toISOString().slice(0, 10);

const computeAge = (iso) => {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const t = new Date();
  let age = t.getFullYear() - dob.getFullYear();
  const m = t.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < dob.getDate())) age--;
  return age;
};

const initial = {
  username: '', email: '', first_name: '', last_name: '',
  password: '', password2: '',
  license_number: '', specialty: '',
  biography: '',
  date_of_birth: '', gender: '',
};

export default function CreateTrainerModal({ onClose, onCreated }) {
  const toast = useToast();
  const [data, setData] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setData({ ...data, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (!data.first_name.trim()) e.first_name = 'Required.';
    if (!data.last_name.trim()) e.last_name = 'Required.';
    if (!data.username.trim() || data.username.length < 3) e.username = 'Username must be at least 3 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = 'Enter a valid email.';
    if (!data.license_number.trim()) e.license_number = 'License number is required.';
    if (!data.gender) e.gender = 'Select a gender.';
    if (!data.biography || data.biography.trim().length < 20) e.biography = 'Biography must be at least 20 characters.';
    if (!data.date_of_birth) {
      e.date_of_birth = 'Date of birth is required.';
    } else {
      const age = computeAge(data.date_of_birth);
      if (age === null || age < 0) e.date_of_birth = 'Enter a valid date of birth.';
      else if (age < 21) e.date_of_birth = 'Trainer must be at least 21 years old.';
    }
    if (!data.password || data.password.length < 6) e.password = 'Password must be at least 6 characters.';
    else if (!/[A-Za-z]/.test(data.password) || !/[0-9]/.test(data.password)) {
      e.password = 'Password must contain letters and numbers.';
    }
    if (data.password !== data.password2) e.password2 = 'Passwords do not match.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({});
    setBusy(true);
    try {
      await api.post('/admin/trainers/', data);
      onCreated();
    } catch (err) {
      const respData = err.response?.data;
      if (respData && typeof respData === 'object') {
        const fe = {};
        Object.entries(respData).forEach(([k, val]) => {
          fe[k] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setErrors(fe);
        toast.error('Please fix the errors below.');
      } else {
        toast.error('Failed to create trainer.');
      }
    } finally {
      setBusy(false);
    }
  };

  const renderError = (k) => errors[k] ? <span className="field-error">{errors[k]}</span> : null;

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="admin-modal-title">Add new trainer</h2>
        <p className="admin-confirm-text">
          Trainers added by an admin are auto-approved and can log in immediately.
        </p>

        <form onSubmit={submit} className="form" noValidate>
          <div className="form-row">
            <div className="form-group">
              <label>First name</label>
              <input type="text" value={data.first_name} onChange={set('first_name')} />
              {renderError('first_name')}
            </div>
            <div className="form-group">
              <label>Last name</label>
              <input type="text" value={data.last_name} onChange={set('last_name')} />
              {renderError('last_name')}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={data.username} onChange={set('username')} />
              {renderError('username')}
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={data.email} onChange={set('email')} />
              {renderError('email')}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date of birth</label>
              <input type="date" max={today()} value={data.date_of_birth} onChange={set('date_of_birth')} />
              {renderError('date_of_birth')}
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select value={data.gender} onChange={set('gender')}>
                <option value="">Select…</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
              {renderError('gender')}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>License number</label>
              <input type="text" value={data.license_number} onChange={set('license_number')} />
              {renderError('license_number')}
            </div>
            <div className="form-group">
              <label>Specialty</label>
              <input type="text" value={data.specialty} onChange={set('specialty')} placeholder="Optional" />
            </div>
          </div>
          <div className="form-group">
            <label>Biography</label>
            <textarea rows={3} value={data.biography} onChange={set('biography')}
              placeholder="At least 20 characters" />
            {renderError('biography')}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={data.password} onChange={set('password')} />
              {renderError('password')}
            </div>
            <div className="form-group">
              <label>Confirm password</label>
              <input type="password" value={data.password2} onChange={set('password2')} />
              {renderError('password2')}
            </div>
          </div>

          <div className="admin-modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn-success" disabled={busy}>
              {busy ? 'Creating...' : 'Create trainer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
