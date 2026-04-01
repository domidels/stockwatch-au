import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Cell
} from 'recharts';
import {
  fetchMarketSummary,
  fetchTopPerformers,
  fetchVolatilityAnalysis,
  fetchStockHistory
} from './api';

// ── Icons ──────────────────────────────────────────────────
const IconTrending = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
const IconDatabase = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);
const IconDollar = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const IconActivity = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconRefresh = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);
const IconBarChart = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const IconZap = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconSearch = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ── Constants ──────────────────────────────────────────────
const BLUE = '#1677ff';
const BLUE_LIGHT = '#e6f0ff';
const GREEN = '#52c41a';
const GREEN_LIGHT = '#f0fff4';
const PURPLE = '#722ed1';
const PURPLE_LIGHT = '#f5f0ff';
const ORANGE = '#fa8c16';
const ORANGE_LIGHT = '#fff7e6';
const SIDEBAR_BG = '#1e2a3a';
const BAR_COLORS = ['#1677ff', '#2684ff', '#3d8fff', '#5599ff', '#6da4ff', '#85afff', '#9dbaff', '#b5c5ff', '#cdd0ff', '#e5dbff'];

const ASX_TICKERS = [
  'CBA.AX', 'BHP.AX', 'CSL.AX', 'MQG.AX', 'WBC.AX',
  'NAB.AX', 'RIO.AX', 'ANZ.AX', 'WES.AX', 'GMG.AX',
  'TLS.AX', 'COL.AX', 'ALL.AX', 'REA.AX', 'STO.AX',
  'XRO.AX', 'WOW.AX', 'FMG.AX', 'SHL.AX', 'COH.AX',
];

// ── Reusable components ────────────────────────────────────
const StatCard = ({ label, value, icon, color, bg }) => (
  <div style={{
    background: '#fff', borderRadius: 12, padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    display: 'flex', alignItems: 'center', gap: 16,
    border: '1px solid #f0f0f0'
  }}>
    <div style={{
      width: 52, height: 52, borderRadius: 12, background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>{icon}</div>
    <div>
      <p style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 700, color: '#1e2a3a', lineHeight: 1 }}>{value}</p>
    </div>
  </div>
);

const SectionCard = ({ title, icon, children }) => (
  <div style={{
    background: '#fff', borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    border: '1px solid #f0f0f0', overflow: 'hidden'
  }}>
    <div style={{
      padding: '16px 24px', borderBottom: '1px solid #f5f5f5',
      display: 'flex', alignItems: 'center', gap: 8
    }}>
      <span style={{ color: BLUE }}>{icon}</span>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1e2a3a' }}>{title}</h2>
    </div>
    <div style={{ padding: 24 }}>{children}</div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8,
      padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: '#1e2a3a' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</strong></p>
      ))}
    </div>
  );
};

// ── Sidebar ────────────────────────────────────────────────
const Sidebar = ({ activePage, setActivePage }) => (
  <div style={{
    width: 240, background: SIDEBAR_BG, minHeight: '100vh',
    display: 'flex', flexDirection: 'column', flexShrink: 0
  }}>
    <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, background: BLUE, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>StockWatch</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>AU Analytics</p>
        </div>
      </div>
    </div>

    <nav style={{ padding: '16px 12px', flex: 1 }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px', marginBottom: 4 }}>Dashboard</p>
      {[
        { id: 'overview', label: 'Market Overview', icon: <IconBarChart /> },
        { id: 'explorer', label: 'Stock Explorer', icon: <IconSearch /> },
      ].map(({ id, label, icon }) => {
        const active = activePage === id;
        return (
          <div key={id} onClick={() => setActivePage(id)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8, marginBottom: 2, cursor: 'pointer',
            background: active ? 'rgba(22,119,255,0.15)' : 'transparent',
            color: active ? '#4da6ff' : 'rgba(255,255,255,0.5)',
            fontWeight: active ? 600 : 400, fontSize: 14,
            transition: 'background 0.15s, color 0.15s'
          }}>
            {icon} {label}
          </div>
        );
      })}

    </nav>

    <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>ASX · 20 stocks tracked</p>
      <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, marginTop: 2 }}>Data via Yahoo Finance</p>
    </div>
  </div>
);

// ── Page: Market Overview ──────────────────────────────────
const PageOverview = ({ summary, topPerformers, volatility, onRefresh }) => (
  <>
    <div style={{
      background: '#fff', padding: '16px 32px',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
    }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e2a3a' }}>ASX Market Overview</h1>
        <p style={{ fontSize: 13, color: '#8c8c8c', marginTop: 2 }}>
          20 stocks · Updated daily after market close
          {summary && ` · Data from ${summary.earliest_date}`}
        </p>
      </div>
      <button onClick={onRefresh} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: BLUE, color: '#fff', border: 'none',
        borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
        fontWeight: 600, fontSize: 13
      }}>
        <IconRefresh /> Refresh
      </button>
    </div>

    <div style={{ padding: 32, maxWidth: 1280, margin: '0 auto' }}>
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
          <StatCard label="Stocks Tracked" value={summary.unique_stocks} icon={<IconTrending />} color={BLUE} bg={BLUE_LIGHT} />
          <StatCard label="Data Points" value={`${(summary.total_records / 1000).toFixed(1)}k`} icon={<IconDatabase />} color={PURPLE} bg={PURPLE_LIGHT} />
          <StatCard label="Avg Price (AUD)" value={`$${summary.avg_price}`} icon={<IconDollar />} color={GREEN} bg={GREEN_LIGHT} />
          <StatCard label="Avg Daily Volume" value={`${(summary.avg_volume / 1000000).toFixed(1)}M`} icon={<IconActivity />} color={ORANGE} bg={ORANGE_LIGHT} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <SectionCard title="Top Performers — Avg Price (AUD)" icon={<IconBarChart />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topPerformers} barSize={28} margin={{ bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
              <XAxis dataKey="ticker" tick={{ fontSize: 11, fill: '#8c8c8c', angle: -35, textAnchor: 'end' }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 12, fill: '#8c8c8c' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f5' }} />
              <Bar dataKey="avg_price" name="Avg Price" radius={[6, 6, 0, 0]}>
                {topPerformers.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Volatility — Std Dev of Daily Returns" icon={<IconZap />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volatility} barSize={28} margin={{ bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
              <XAxis dataKey="ticker" tick={{ fontSize: 11, fill: '#8c8c8c', angle: -35, textAnchor: 'end' }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 12, fill: '#8c8c8c' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f5' }} />
              <Bar dataKey="volatility_std" name="Volatility %" radius={[6, 6, 0, 0]}>
                {volatility.map((_, i) => <Cell key={i} fill={`hsl(0, 80%, ${65 - i * 4}%)`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <SectionCard title="Top Stocks by Average Price" icon={<IconBarChart />}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                {['Ticker', 'Avg Price', 'Max Price', 'Volatility'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#8c8c8c', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topPerformers.map((stock, i) => (
                <tr key={stock.ticker} style={{ borderBottom: '1px solid #fafafa', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '11px 12px' }}>
                    <span style={{ background: BLUE_LIGHT, color: BLUE, padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>{stock.ticker}</span>
                  </td>
                  <td style={{ padding: '11px 12px', fontWeight: 600, color: '#1e2a3a' }}>${stock.avg_price}</td>
                  <td style={{ padding: '11px 12px', color: GREEN, fontWeight: 500 }}>${stock.max_price}</td>
                  <td style={{ padding: '11px 12px', color: '#8c8c8c' }}>{stock.volatility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Most Volatile Stocks" icon={<IconZap />}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                {['Ticker', 'Volatility', 'Avg Change', 'Worst Day', 'Best Day'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#8c8c8c', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {volatility.map((stock, i) => (
                <tr key={stock.ticker} style={{ borderBottom: '1px solid #fafafa', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '11px 12px' }}>
                    <span style={{ background: '#fff1f0', color: '#ff4d4f', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>{stock.ticker}</span>
                  </td>
                  <td style={{ padding: '11px 12px', color: '#ff4d4f', fontWeight: 600 }}>{stock.volatility_std}%</td>
                  <td style={{ padding: '11px 12px', color: ORANGE, fontWeight: 500 }}>{stock.avg_daily_change}%</td>
                  <td style={{ padding: '11px 12px', color: '#ff4d4f' }}>{stock.worst_day}%</td>
                  <td style={{ padding: '11px 12px', color: GREEN }}>{stock.best_day}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </div>
  </>
);

// ── Page: Stock Explorer ───────────────────────────────────
const PageExplorer = ({ ticker, setTicker }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { loadHistory(ticker); }, [ticker]);

  const loadHistory = async (t) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStockHistory(t);
      setHistory(data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const latest = history[history.length - 1] || {};
  const oldest = history[0] || {};
  const allClose = history.map(d => d.close).filter(Boolean);
  const maxClose = allClose.length ? Math.max(...allClose) : null;
  const minClose = allClose.length ? Math.min(...allClose) : null;
  const priceChange = latest.close && oldest.close
    ? (((latest.close - oldest.close) / oldest.close) * 100).toFixed(2)
    : null;
  const isPositive = priceChange > 0;

  // Show only month labels on X axis (not every day)
  const tickFormatter = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-AU', { month: 'short' });
  };

  return (
    <>
      {/* Top bar */}
      <div style={{
        background: '#fff', padding: '16px 32px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e2a3a' }}>Stock Explorer</h1>
          <p style={{ fontSize: 13, color: '#8c8c8c', marginTop: 2 }}>Closing price history · Updated daily after ASX close (4:30 PM Sydney)</p>
        </div>
      </div>

      <div style={{ padding: 32, maxWidth: 1280, margin: '0 auto' }}>
        {/* Ticker selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#1e2a3a' }}>Select Ticker</label>
          <select
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid #d9d9d9',
              fontSize: 14, fontWeight: 600, color: '#1e2a3a', cursor: 'pointer',
              outline: 'none', background: '#fff', fontFamily: 'inherit'
            }}
          >
            {ASX_TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Mini stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
          <StatCard label="Latest Close" value={latest.close ? `$${latest.close.toFixed(2)}` : '—'} icon={<IconDollar />} color={BLUE} bg={BLUE_LIGHT} />
          <StatCard
            label="6-Month Change"
            value={priceChange !== null ? `${isPositive ? '+' : ''}${priceChange}%` : '—'}
            icon={<IconTrending />}
            color={isPositive ? GREEN : '#ff4d4f'}
            bg={isPositive ? GREEN_LIGHT : '#fff1f0'}
          />
          <StatCard label="6-Month High" value={maxClose ? `$${maxClose.toFixed(2)}` : '—'} icon={<IconActivity />} color={GREEN} bg={GREEN_LIGHT} />
          <StatCard label="6-Month Low" value={minClose ? `$${minClose.toFixed(2)}` : '—'} icon={<IconActivity />} color={ORANGE} bg={ORANGE_LIGHT} />
        </div>

        {/* Line chart */}
        <div style={{ marginBottom: 28 }}>
          <SectionCard title={`Closing Price — ${ticker}`} icon={<IconSearch />}>
            {loading ? (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: 36, height: 36, border: `3px solid ${BLUE_LIGHT}`,
                  borderTopColor: BLUE, borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
              </div>
            ) : error ? (
              <p style={{ color: '#ff4d4f', textAlign: 'center', padding: 40 }}>{error}</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#8c8c8c' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={tickFormatter}
                    interval={19}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#8c8c8c' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `$${v}`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone" dataKey="close" name="Close"
                    stroke={BLUE} strokeWidth={2} dot={false}
                    activeDot={{ r: 5, fill: BLUE }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>

        {/* Last 10 sessions table */}
        <SectionCard title="Last 10 Sessions" icon={<IconBarChart />}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                {['Date', 'Open', 'High', 'Low', 'Close', 'Volume'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#8c8c8c', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().slice(0, 10).map((row, i) => {
                const up = row.close >= row.open;
                return (
                  <tr key={row.date} style={{ borderBottom: '1px solid #fafafa', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500, color: '#1e2a3a' }}>{row.date}</td>
                    <td style={{ padding: '10px 12px', color: '#8c8c8c' }}>${row.open?.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', color: GREEN }}>${row.high?.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', color: '#ff4d4f' }}>${row.low?.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: up ? GREEN : '#ff4d4f' }}>${row.close?.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', color: '#8c8c8c' }}>{row.volume?.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SectionCard>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

// ── Main App ───────────────────────────────────────────────
export const Dashboard = () => {
  const [activePage, setActivePage] = useState('overview');
  const [ticker, setTicker] = useState('CBA.AX');
  const [summary, setSummary] = useState(null);
  const [topPerformers, setTopPerformers] = useState([]);
  const [volatility, setVolatility] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryData, performersData, volatilityData] = await Promise.all([
        fetchMarketSummary(),
        fetchTopPerformers(),
        fetchVolatilityAnalysis()
      ]);
      setSummary(summaryData);
      setTopPerformers(performersData);
      setVolatility(volatilityData);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, border: `3px solid ${BLUE_LIGHT}`,
            borderTopColor: BLUE, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ color: '#8c8c8c', fontWeight: 500 }}>Loading ASX data...</p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <p style={{ color: '#ff4d4f', marginBottom: 16, fontWeight: 500 }}>Error: {error}</p>
          <button onClick={loadData} style={{
            background: BLUE, color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 24px', cursor: 'pointer',
            fontWeight: 600, fontSize: 14
          }}>Retry</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activePage === 'overview'
          ? <PageOverview summary={summary} topPerformers={topPerformers} volatility={volatility} onRefresh={loadData} />
          : <PageExplorer ticker={ticker} setTicker={setTicker} />
        }
        {lastUpdated && (
          <p style={{ textAlign: 'center', color: '#bfbfbf', fontSize: 12, padding: '16px 0 32px' }}>
            Last updated at {lastUpdated} · Powered by Snowflake & AWS
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
