import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart,
} from 'recharts';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const PERIODS = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: 'ytd', label: 'YTD' },
];

const numberFmt = new Intl.NumberFormat('en-ME');

const ACTIVITY_LABELS = {
  new_client: { icon: '👤', tone: 'info' },
  new_trainer: { icon: '🏋️', tone: 'info' },
  trainer_approved: { icon: '✓', tone: 'good' },
  refund: { icon: '↩', tone: 'warn' },
};

export default function AdminHome() {
  const toast = useToast();
  const [period, setPeriod] = useState('30d');
  const [overview, setOverview] = useState(null);
  const [clientSeries, setClientSeries] = useState(null);
  const [trainerSeries, setTrainerSeries] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, cs, ts, act] = await Promise.all([
        api.get('/admin/stats/overview/', { params: { period } }),
        api.get('/admin/stats/signups-timeseries/', { params: { period, role: 'CLIENT' } }),
        api.get('/admin/stats/signups-timeseries/', { params: { period, role: 'TRAINER' } }),
        api.get('/admin/stats/recent-activity/', { params: { limit: 10 } }),
      ]);
      setOverview(ov.data);
      setClientSeries(cs.data.series);
      setTrainerSeries(ts.data.series);
      setActivity(act.data.events);
    } catch {
      toast.error('Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [period, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="admin-page">
      <div className="dashboard-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Quick overview of recent activity and key metrics.</p>
        </div>
        <div className="reports-segmented">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`reports-seg-btn ${period === p.key ? 'active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="kpi-row dashboard-kpi-row">
        <KpiCard label="New Clients" loading={loading}
                 metric={overview?.new_clients} sparkSeries={clientSeries} />
        <KpiCard label="New Trainers" loading={loading}
                 metric={overview?.new_trainers} sparkSeries={trainerSeries} />
        <KpiCard label="Renewals" loading={loading} metric={overview?.membership_renewals} />
        <KpiCard label="Active Clients" loading={loading} metric={overview?.active_clients} />
        <PendingApprovalsCard loading={loading} count={overview?.pending_trainer_approvals} />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-charts">
          <SignupChart loading={loading} title="Client signups" series={clientSeries} color="#ff6b00" />
          <SignupChart loading={loading} title="Trainer signups" series={trainerSeries} color="#4ade80" />
        </div>
        <ActivityFeed loading={loading} events={activity} />
      </div>
    </div>
  );
}

function KpiCard({ label, metric, loading, sparkSeries }) {
  if (loading || !metric) {
    return <div className="kpi-card kpi-skeleton" />;
  }
  const count = metric.count ?? 0;
  const delta = metric.delta_pct;
  const direction = delta == null ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const arrow = delta == null ? '–' : delta > 0 ? '▲' : delta < 0 ? '▼' : '–';
  const deltaText = delta == null ? 'no prior data' : `${arrow} ${Math.abs(delta).toFixed(1)}%`;

  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{numberFmt.format(count)}</div>
      <div className={`kpi-delta kpi-delta-${direction}`}>
        {deltaText} <span className="kpi-vs">vs. previous</span>
      </div>
      {sparkSeries && sparkSeries.length > 1 && (
        <div className="kpi-spark">
          <ResponsiveContainer>
            <BarChart data={sparkSeries.map((d) => ({ count: d.count }))}>
              <Bar dataKey="count" fill="#ff6b00" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function PendingApprovalsCard({ loading, count }) {
  if (loading) return <div className="kpi-card kpi-skeleton" />;
  const n = count ?? 0;
  return (
    <Link to="/admin/trainers" className={`kpi-card kpi-link ${n > 0 ? 'kpi-attention' : ''}`}>
      <div className="kpi-label">Pending Approvals</div>
      <div className="kpi-value">{numberFmt.format(n)}</div>
      <div className="kpi-link-cta">Review trainers →</div>
    </Link>
  );
}

function SignupChart({ loading, title, series, color }) {
  const data = useMemo(() => (
    (series || []).map((d) => {
      const dt = new Date(d.date);
      const label = dt.toLocaleDateString('en-ME', { month: 'short', day: 'numeric' });
      return { ...d, label };
    })
  ), [series]);

  if (loading) return <div className="reports-card chart-skeleton" />;
  if (!series || series.length === 0) {
    return <div className="reports-card chart-empty">No data.</div>;
  }
  const allZero = series.every((d) => d.count === 0);
  if (allZero) {
    return (
      <div className="reports-card">
        <div className="reports-card-title">{title}</div>
        <div className="chart-empty">No signups in this period.</div>
      </div>
    );
  }
  return (
    <div className="reports-card">
      <div className="reports-card-title">{title}</div>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id={`g-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1f1f1f" vertical={false} />
            <XAxis dataKey="label" stroke="#666" tick={{ fontSize: 11 }} minTickGap={20} />
            <YAxis stroke="#666" tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
            <Tooltip
              contentStyle={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
            />
            <Area type="monotone" dataKey="count" stroke={color} strokeWidth={2}
                  fill={`url(#g-${color.replace('#', '')})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ActivityFeed({ loading, events }) {
  return (
    <div className="reports-card activity-feed">
      <div className="reports-card-title">Recent activity</div>
      {loading && (
        <>
          <div className="activity-skeleton" />
          <div className="activity-skeleton" />
          <div className="activity-skeleton" />
        </>
      )}
      {!loading && events && events.length === 0 && (
        <div className="chart-empty" style={{ height: 'auto', padding: '1rem 0' }}>
          No activity yet.
        </div>
      )}
      {!loading && events && events.map((ev, i) => {
        const meta = ACTIVITY_LABELS[ev.type] || { icon: '•', tone: 'info' };
        const dt = new Date(ev.timestamp);
        return (
          <div key={i} className="activity-item">
            <span className={`activity-dot activity-${meta.tone}`}>{meta.icon}</span>
            <div className="activity-body">
              <div className="activity-msg">{ev.message}</div>
              <div className="activity-time">{dt.toLocaleString('en-ME')}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
