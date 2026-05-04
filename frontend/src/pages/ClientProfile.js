import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import './ClientArea.css';

const today = () => new Date().toISOString().slice(0, 10);

const fromProfile = (p) => ({
  first_name: p?.user?.first_name || '',
  last_name: p?.user?.last_name || '',
  date_of_birth: p?.date_of_birth || '',
  gender: p?.gender || '',
  height: p?.height ?? '',
  weight: p?.weight ?? '',
  circumference: p?.circumference ?? '',
  description: p?.description || '',
  health_status: p?.health_status || '',
  weekly_workouts: p?.weekly_workouts ?? 3,
  workout_location: p?.workout_location || 'gym',
  home_accessory_ids: (p?.home_accessories || []).map((a) => a.id),
  goal_ids: (p?.goals || []).map((g) => g.id),
});

export default function ClientProfile() {
  const toast = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [accessories, setAccessories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [data, setData] = useState(fromProfile(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/clients/me/profile/'),
      api.get('/accessories/'),
      api.get('/goals/'),
    ])
      .then(([prof, acc, gls]) => {
        if (cancelled) return;
        setProfile(prof.data);
        setData(fromProfile(prof.data));
        setAccessories(Array.isArray(acc.data) ? acc.data : acc.data.results || []);
        setGoals(Array.isArray(gls.data) ? gls.data : gls.data.results || []);
      })
      .catch(() => toast.error('Failed to load profile.'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [toast]);

  const set = (k) => (e) => {
    const v = e?.target ? e.target.value : e;
    setData((d) => ({ ...d, [k]: v }));
  };

  const toggleId = (key, id) => {
    setData((d) => {
      const has = d[key].includes(id);
      return { ...d, [key]: has ? d[key].filter((x) => x !== id) : [...d[key], id] };
    });
  };

  const isHome = data.workout_location === 'home';

  const validate = () => {
    const e = {};
    if (data.height !== '' && (Number(data.height) <= 50 || Number(data.height) >= 260)) {
      e.height = 'Height must be 50–260 cm.';
    }
    if (data.weight !== '' && (Number(data.weight) <= 20 || Number(data.weight) >= 400)) {
      e.weight = 'Weight must be 20–400 kg.';
    }
    if (data.circumference !== '' && (Number(data.circumference) <= 30 || Number(data.circumference) >= 250)) {
      e.circumference = 'Circumference must be 30–250 cm.';
    }
    const ww = Number(data.weekly_workouts);
    if (Number.isNaN(ww) || ww < 0 || ww > 14) e.weekly_workouts = 'Pick 0–14.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({});
    setSaving(true);

    const payload = {
      first_name: data.first_name,
      last_name: data.last_name,
      date_of_birth: data.date_of_birth || null,
      gender: data.gender || '',
      height: data.height === '' ? null : Number(data.height),
      weight: data.weight === '' ? null : Number(data.weight),
      circumference: data.circumference === '' ? null : Number(data.circumference),
      description: data.description,
      health_status: data.health_status,
      weekly_workouts: Number(data.weekly_workouts),
      workout_location: data.workout_location,
      goal_ids: data.goal_ids,
      // Only send accessories when at home; otherwise clear them.
      home_accessory_ids: isHome ? data.home_accessory_ids : [],
    };

    try {
      const res = await api.patch('/clients/me/profile/', payload);
      setProfile(res.data);
      setData(fromProfile(res.data));
      toast.success('Profile saved.');
      navigate('/client');
    } catch (err) {
      const respData = err.response?.data;
      if (respData && typeof respData === 'object') {
        const fe = {};
        Object.entries(respData).forEach(([k, v]) => {
          fe[k] = Array.isArray(v) ? v.join(' ') : String(v);
        });
        setErrors(fe);
        toast.error('Please fix the errors below.');
      } else {
        toast.error('Save failed.');
      }
    } finally {
      setSaving(false);
    }
  };

  const sortedAccessories = useMemo(
    () => [...accessories].sort((a, b) => a.name.localeCompare(b.name)),
    [accessories]
  );
  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => a.name.localeCompare(b.name)),
    [goals]
  );

  if (loading) {
    return <div className="client-shell"><div className="client-main"><div className="client-card client-card-skeleton" /></div></div>;
  }

  return (
    <div className="client-shell">
      <nav className="client-nav">
        <Link to="/client" className="logo">
          <span className="logo-icon">LP</span>
          <span className="logo-text">LikeAPro</span>
        </Link>
        <Link to="/client" className="client-logout">← Back</Link>
      </nav>

      <main className="client-main">
        <h1 className="client-greeting">Your profile</h1>
        <p className="client-sub">
          Tell us about yourself so we can tailor your plan.
          {!profile?.is_complete && ' Required fields are marked with *.'}
        </p>

        <form onSubmit={submit} className="profile-form" noValidate>
          <Section title="Basics">
            <div className="form-row">
              <Field label="Name *" error={errors.first_name}>
                <input type="text" value={data.first_name} onChange={set('first_name')} />
              </Field>
              <Field label="Surname *" error={errors.last_name}>
                <input type="text" value={data.last_name} onChange={set('last_name')} />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Date of birth *" error={errors.date_of_birth}>
                <input type="date" max={today()} value={data.date_of_birth} onChange={set('date_of_birth')} />
              </Field>
              <Field label="Gender *" error={errors.gender}>
                <select value={data.gender} onChange={set('gender')}>
                  <option value="">Select…</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Body">
            <div className="form-row">
              <Field label="Height (cm) *" error={errors.height}>
                <input type="number" min="50" max="260" value={data.height} onChange={set('height')} />
              </Field>
              <Field label="Weight (kg) *" error={errors.weight}>
                <input type="number" min="20" max="400" value={data.weight} onChange={set('weight')} />
              </Field>
              <Field label="Circumference (cm)" error={errors.circumference}>
                <input type="number" min="30" max="250" value={data.circumference} onChange={set('circumference')} />
              </Field>
            </div>
          </Section>

          <Section title="About you">
            <Field label="Short description">
              <textarea rows={3} value={data.description} onChange={set('description')}
                placeholder="A few words about yourself, fitness background, what brought you here…" />
            </Field>
            <Field label="Health problems / conditions">
              <textarea rows={3} value={data.health_status} onChange={set('health_status')}
                placeholder="Any injuries, allergies, or chronic conditions a trainer should know about." />
            </Field>
          </Section>

          <Section title="Training preferences">
            <div className="form-row">
              <Field label="Sessions per week *" error={errors.weekly_workouts}>
                <input type="number" min="0" max="14" value={data.weekly_workouts} onChange={set('weekly_workouts')} />
              </Field>
              <Field label="Where will you train? *">
                <div className="radio-row">
                  {['gym', 'home'].map((loc) => (
                    <label key={loc} className={`radio-pill ${data.workout_location === loc ? 'active' : ''}`}>
                      <input type="radio" name="workout_location" value={loc}
                             checked={data.workout_location === loc}
                             onChange={() => set('workout_location')(loc)} />
                      {loc === 'gym' ? 'At the gym' : 'At home'}
                    </label>
                  ))}
                </div>
              </Field>
            </div>

            {isHome && (
              <Field label="What do you have at home? (optional)">
                <ChipPicker
                  items={sortedAccessories}
                  selected={data.home_accessory_ids}
                  onToggle={(id) => toggleId('home_accessory_ids', id)}
                  emptyLabel="No accessories in the catalog yet."
                />
              </Field>
            )}
          </Section>

          <Section title="Your goals">
            <Field label="Pick what you want to achieve">
              <ChipPicker
                items={sortedGoals}
                selected={data.goal_ids}
                onToggle={(id) => toggleId('goal_ids', id)}
                emptyLabel="No active goals available."
              />
            </Field>
          </Section>

          <div className="profile-actions">
            <Link to="/client" className="btn-secondary">Cancel</Link>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

const Section = ({ title, children }) => (
  <section className="profile-section">
    <h2 className="profile-section-title">{title}</h2>
    {children}
  </section>
);

const Field = ({ label, error, children }) => (
  <label className="profile-field">
    <span className="profile-field-label">{label}</span>
    {children}
    {error && <span className="field-error">{error}</span>}
  </label>
);

function ChipPicker({ items, selected, onToggle, emptyLabel }) {
  if (!items || items.length === 0) {
    return <div className="chip-empty">{emptyLabel}</div>;
  }
  return (
    <div className="chip-grid">
      {items.map((it) => {
        const isSel = selected.includes(it.id);
        return (
          <button
            key={it.id}
            type="button"
            className={`chip ${isSel ? 'chip-selected' : ''}`}
            onClick={() => onToggle(it.id)}
          >
            {it.name}
          </button>
        );
      })}
    </div>
  );
}
