import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const GRANULARITIES = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'annual', label: 'Annual' },
];

const currencyFmt = new Intl.NumberFormat('en-ME', { style: 'currency', currency: 'EUR' });
const numberFmt = new Intl.NumberFormat('en-ME');

const fmtCurrency = (v) => currencyFmt.format(Number(v ?? 0));

const PAGE_SIZE = 10;
const SORT_KEYS = ['net', 'gross', 'refunds', 'transactions'];

export default function AdminReports() {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [granularity, setGranularity] = useState('monthly');
  const [year, setYear] = useState(currentYear);
  const [revenue, setRevenue] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const yearWindow = useMemo(() => {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }, [year]);

  const loadRevenue = useCallback(async () => {
    setLoading(true);
    try {
      const [cur, prev] = await Promise.all([
        api.get('/admin/reports/revenue/', { params: { granularity, year } }),
        api.get('/admin/reports/revenue/', { params: { granularity, year: year - 1 } }),
      ]);
      setRevenue(cur.data);
      setPrevious(prev.data);
    } catch {
      toast.error('Failed to load revenue.');
    } finally {
      setLoading(false);
    }
  }, [granularity, year, toast]);

  useEffect(() => { loadRevenue(); }, [loadRevenue]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/reports/revenue/export.csv', {
        params: { granularity, year },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-${year}-${granularity}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV exported.');
    } catch {
      toast.error('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const yearOptions = [];
  for (let y = currentYear; y >= currentYear - 5; y--) yearOptions.push(y);

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Financial Reports</h1>
      <p className="admin-page-subtitle">Revenue by period, refunds, and top earning trainers.</p>

      <div className="reports-toolbar">
        <div className="reports-toolbar-left">
          <div className="reports-segmented">
            {GRANULARITIES.map((g) => (
              <button
                key={g.key}
                className={`reports-seg-btn ${granularity === g.key ? 'active' : ''}`}
                onClick={() => setGranularity(g.key)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <select
            className="reports-year-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button className="btn-success" onClick={handleExport} disabled={exporting || loading}>
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <KpiRow loading={loading} current={revenue?.totals} previous={previous?.totals} year={year} />

      <RevenueChart loading={loading} series={revenue?.series} granularity={granularity} />

      <TopTrainersTable from={yearWindow.from} to={yearWindow.to} year={year} />
    </div>
  );
}

function KpiRow({ loading, current, previous, year }) {
  const cards = [
    { key: 'net', label: 'Net Revenue', kind: 'currency' },
    { key: 'gross', label: 'Gross Revenue', kind: 'currency' },
    { key: 'refunds', label: 'Refunds', kind: 'currency' },
    { key: 'transactions', label: 'Transactions', kind: 'number' },
  ];
  return (
    <div className="kpi-row">
      {cards.map((c) => (
        <KpiCard
          key={c.key}
          label={c.label}
          loading={loading}
          value={current ? current[c.key] : null}
          previous={previous ? previous[c.key] : null}
          kind={c.kind}
          year={year}
        />
      ))}
    </div>
  );
}

function KpiCard({ label, value, previous, loading, kind, year }) {
  if (loading) return <div className="kpi-card kpi-skeleton" />;
  const num = Number(value ?? 0);
  const prev = Number(previous ?? 0);
  const delta = num - prev;
  const pct = prev !== 0 ? (delta / Math.abs(prev)) * 100 : (num !== 0 ? 100 : 0);
  const display = kind === 'currency' ? fmtCurrency(num) : numberFmt.format(num);
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '–';
  const pctText = prev === 0 && num === 0 ? '—' : `${arrow} ${Math.abs(pct).toFixed(1)}%`;
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{display}</div>
      <div className={`kpi-delta kpi-delta-${direction}`}>
        {pctText} <span className="kpi-vs">vs. {year - 1}</span>
      </div>
    </div>
  );
}

function RevenueChart({ loading, series, granularity }) {
  if (loading) {
    return <div className="reports-card chart-skeleton" />;
  }
  if (!series || series.length === 0) {
    return <div className="reports-card chart-empty">No data for this period.</div>;
  }
  const data = series.map((row) => ({
    period: shortLabel(row.period, granularity),
    net: Number(row.net),
    gross: Number(row.gross),
    refunds: Number(row.refunds),
  }));
  const allZero = data.every((d) => d.net === 0 && d.gross === 0 && d.refunds === 0);
  if (allZero) {
    return <div className="reports-card chart-empty">No revenue recorded for this period.</div>;
  }
  return (
    <div className="reports-card">
      <div className="reports-card-title">Net revenue</div>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="#1f1f1f" vertical={false} />
            <XAxis dataKey="period" stroke="#666" tick={{ fontSize: 12 }} />
            <YAxis stroke="#666" tick={{ fontSize: 12 }} tickFormatter={(v) => fmtCurrency(v).replace('€', '€ ')} width={90} />
            <Tooltip
              contentStyle={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              formatter={(v) => fmtCurrency(v)}
            />
            <Bar dataKey="net" fill="#ff6b00" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function shortLabel(period, granularity) {
  if (granularity === 'monthly') {
    const [, m] = period.split('-');
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m) - 1] || period;
  }
  return period;
}

function TopTrainersTable({ from, to, year }) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('net');
  const [data, setData] = useState({ results: [], count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [year]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/admin/reports/revenue/by-trainer/', {
      params: { from, to, page, page_size: PAGE_SIZE },
    })
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) toast.error('Failed to load trainers.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, page, toast]);

  const sortedRows = useMemo(() => {
    const rows = [...(data.results || [])];
    rows.sort((a, b) => Number(b[sortKey]) - Number(a[sortKey]));
    return rows;
  }, [data.results, sortKey]);

  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));

  return (
    <div className="reports-card">
      <div className="reports-card-title">Top trainers · {year}</div>
      <div className="admin-table-wrap reports-trainers-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Trainer</th>
              {SORT_KEYS.map((key) => (
                <th
                  key={key}
                  className={`sortable ${sortKey === key ? 'sort-active' : ''}`}
                  onClick={() => setSortKey(key)}
                  title="Sort"
                >
                  {labelFor(key)} {sortKey === key ? '↓' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5" className="admin-empty">Loading...</td></tr>}
            {!loading && sortedRows.length === 0 && (
              <tr><td colSpan="5" className="admin-empty">No trainer revenue for this period.</td></tr>
            )}
            {!loading && sortedRows.map((r) => (
              <tr key={r.trainer_id}>
                <td className="catalog-name">{r.trainer_name}</td>
                <td>{fmtCurrency(r.net)}</td>
                <td>{fmtCurrency(r.gross)}</td>
                <td>{fmtCurrency(r.refunds)}</td>
                <td>{numberFmt.format(r.transactions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.count > PAGE_SIZE && (
        <div className="admin-pagination">
          <button
            className="page-btn"
            disabled={!data.previous}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >Previous</button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button
            className="page-btn"
            disabled={!data.next}
            onClick={() => setPage((p) => p + 1)}
          >Next</button>
        </div>
      )}
    </div>
  );
}

function labelFor(key) {
  switch (key) {
    case 'net': return 'Net';
    case 'gross': return 'Gross';
    case 'refunds': return 'Refunds';
    case 'transactions': return 'Transactions';
    default: return key;
  }
}
