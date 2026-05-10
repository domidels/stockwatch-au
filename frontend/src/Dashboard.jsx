import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
  BarChart, Bar, Cell,
  ScatterChart, Scatter, ZAxis, ReferenceLine, ReferenceArea, Label, Customized
} from 'recharts';
import {
  fetchMarketSummary,
  fetchTopPerformers,
  fetchVolatilityAnalysis,
  fetchStockHistory,
  fetchMonthlyReturns,
  fetchPCA
} from './api';

// ── Icons ──────────────────────────────────────────────────
const IconTrending = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
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
const IconInfo = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IconGrid = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconCorrelation = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M2 12 Q6 4 10 12 Q14 20 18 12 Q20 8 22 12"/>
    <circle cx="6" cy="9" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="18" cy="9" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);

const IconCluster = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="12" cy="5" r="2"/>
    <line x1="5" y1="19" x2="12" y2="5"/><line x1="19" y1="19" x2="12" y2="5"/><line x1="5" y1="19" x2="19" y2="19"/>
  </svg>
);

// ── Constants ──────────────────────────────────────────────
const BLUE = '#0072B2';
const BLUE_LIGHT = '#d6eaf8';
const GREEN = '#009E73';
const GREEN_LIGHT = '#d0f0e8';
const PURPLE = '#CC79A7';
const PURPLE_LIGHT = '#f7e8f0';
const ORANGE = '#E69F00';
const ORANGE_LIGHT = '#fdf3d0';
const RED = '#D55E00';
const RED_LIGHT = '#fae8e0';
const SIDEBAR_BG = '#1e2a3a';

// Okabe-Ito colorblind-safe palette
const CATEGORIES = {
  Banking:          { tickers: ['CBA.AX','WBC.AX','NAB.AX','ANZ.AX','MQG.AX'], color: '#0072B2' },
  'Mining & Energy':{ tickers: ['BHP.AX','RIO.AX','FMG.AX','STO.AX'],          color: '#E69F00' },
  Healthcare:       { tickers: ['CSL.AX','COH.AX','SHL.AX'],                   color: '#009E73' },
  Retail:           { tickers: ['WES.AX','COL.AX','WOW.AX'],                   color: '#CC79A7' },
  Technology:       { tickers: ['XRO.AX','ALL.AX','TLS.AX'],                   color: '#56B4E9' },
  'Real Estate':    { tickers: ['REA.AX','GMG.AX'],                            color: '#D55E00' },
};
const ASX_TICKERS = [
  'ALL.AX', 'ANZ.AX', 'BHP.AX', 'CBA.AX', 'COH.AX',
  'COL.AX', 'CSL.AX', 'FMG.AX', 'GMG.AX', 'MQG.AX',
  'NAB.AX', 'REA.AX', 'RIO.AX', 'SHL.AX', 'STO.AX',
  'TLS.AX', 'WBC.AX', 'WES.AX', 'WOW.AX', 'XRO.AX',
];

const STOCK_INFO = [
  { ticker: 'CBA.AX', company: 'Commonwealth Bank', sector: 'Banking', description: 'Australia\'s largest bank by market capitalisation. Provides retail, business and institutional banking services across Australia and internationally.' },
  { ticker: 'BHP.AX', company: 'BHP Group', sector: 'Mining', description: 'One of the world\'s largest mining companies. Primarily extracts iron ore, copper and coal. Also listed in London.' },
  { ticker: 'CSL.AX', company: 'CSL Limited', sector: 'Healthcare / Biotech', description: 'Global leader in plasma-derived blood products and vaccines. Operates in over 100 countries. One of the most highly valued biotechs in the world.' },
  { ticker: 'MQG.AX', company: 'Macquarie Group', sector: 'Finance', description: 'Globally recognised Australian investment bank and asset manager. Specialises in infrastructure, energy and financial markets.' },
  { ticker: 'WBC.AX', company: 'Westpac Banking Corp', sector: 'Banking', description: 'One of Australia\'s four major banks. Founded in 1817, it is Australia\'s oldest bank. Offers retail and business banking services.' },
  { ticker: 'NAB.AX', company: 'National Australia Bank', sector: 'Banking', description: 'One of Australia\'s four major banks. Strong presence in business and retail banking. Also operates in New Zealand.' },
  { ticker: 'RIO.AX', company: 'Rio Tinto', sector: 'Mining', description: 'Anglo-Australian mining giant. World\'s leading producer of iron ore and aluminium. Also listed in London and New York.' },
  { ticker: 'ANZ.AX', company: 'ANZ Banking Group', sector: 'Banking', description: 'One of Australia\'s four major banks with a strong presence across Asia-Pacific. Provides retail, business and institutional banking services.' },
  { ticker: 'WES.AX', company: 'Wesfarmers', sector: 'Retail / Conglomerate', description: 'Diversified conglomerate owning Bunnings (hardware), Kmart, Target and chemical businesses. One of Australia\'s largest employers.' },
  { ticker: 'GMG.AX', company: 'Goodman Group', sector: 'Real Estate', description: 'Global manager of logistics warehouses and industrial properties. Benefits from e-commerce growth. Operates across 3 continents.' },
  { ticker: 'TLS.AX', company: 'Telstra', sector: 'Technology / Telecom', description: 'Australia\'s leading telecom operator. Provides mobile, fixed-line and internet services for individuals and businesses. Rolling out 5G network.' },
  { ticker: 'COL.AX', company: 'Coles Group', sector: 'Retail / Supermarkets', description: 'Australia\'s second largest supermarket chain after Woolworths. Also operates liquor stores and fuel outlets. Demerged from Wesfarmers in 2018.' },
  { ticker: 'ALL.AX', company: 'Aristocrat Leisure', sector: 'Technology / Gaming', description: 'Global manufacturer of slot machines and mobile game developer. Present in casinos across 90 countries. Strong growth in digital gaming.' },
  { ticker: 'REA.AX', company: 'REA Group', sector: 'Real Estate', description: 'Operator of realestate.com.au, Australia\'s leading property portal. 62% owned by News Corp. Also present in India and the United States.' },
  { ticker: 'STO.AX', company: 'Santos', sector: 'Energy / Oil & Gas', description: 'Australian producer of oil and liquefied natural gas (LNG). Operates primarily in Australia, PNG and Timor-Leste. Key supplier to Asia.' },
  { ticker: 'XRO.AX', company: 'Xero', sector: 'Technology / SaaS', description: 'New Zealand-based cloud accounting software provider for SMEs. Market leader in Australia and New Zealand. Expanding in the UK and US.' },
  { ticker: 'WOW.AX', company: 'Woolworths Group', sector: 'Retail / Supermarkets', description: 'Australia\'s largest retail group. Operates supermarkets, liquor stores (BWS, Dan Murphy\'s) and Big W. One of the country\'s largest employers.' },
  { ticker: 'FMG.AX', company: 'Fortescue', sector: 'Mining / Iron Ore', description: 'World\'s third largest iron ore producer. Founded by Andrew Forrest. Investing heavily in green hydrogen through Fortescue Future Industries.' },
  { ticker: 'SHL.AX', company: 'Sonic Healthcare', sector: 'Healthcare / Diagnostics', description: 'Global network of medical laboratories and radiology services. Present in Australia, Germany, USA, Switzerland and UK. Strong growth during COVID.' },
  { ticker: 'COH.AX', company: 'Cochlear', sector: 'Healthcare / Medical Devices', description: 'World leader in cochlear implants (hearing prosthetics). Present in 180 countries. An iconic Australian product born from University of Sydney research.' },
];

const PERIOD_LABELS = {
  30: '1-Month',
  90: '3-Month',
  180: '6-Month',
  365: '1-Year',
  730: '2-Year',
  null: 'All-Period',
};

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
      <p style={{ fontSize: 14, color: '#8c8c8c', fontWeight: 500, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#1e2a3a', lineHeight: 1 }}>{value}</p>
    </div>
  </div>
);

const SectionCard = ({ title, icon, children, hint }) => {
  const [showHint, setShowHint] = useState(false);
  const [hintPos, setHintPos] = useState({ x: 0, y: 0 });
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: BLUE }}>{icon}</span>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1e2a3a', flex: 1 }}>{title}</h2>
        {hint && (
          <span
            onMouseEnter={e => { setShowHint(true); setHintPos({ x: e.clientX, y: e.clientY }); }}
            onMouseMove={e => setHintPos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setShowHint(false)}
            style={{ color: '#bfbfbf', cursor: 'help', display: 'flex', alignItems: 'center', padding: 4, flexShrink: 0 }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
        )}
      </div>
      <div style={{ padding: 24 }}>{children}</div>
      {showHint && hint && (
        <div style={{
          position: 'fixed', left: hintPos.x + 16, top: hintPos.y - 8, zIndex: 2000,
          background: '#1e2a3a', color: '#fff', borderRadius: 10,
          padding: '14px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
          fontSize: 12, maxWidth: 310, lineHeight: 1.65, pointerEvents: 'none'
        }}>
          <p style={{ fontWeight: 700, marginBottom: 8, color: '#56B4E9', fontSize: 13 }}>How to read this chart</p>
          {hint.split('\n').map((line, i, arr) => (
            <p key={i} style={{ marginBottom: i < arr.length - 1 ? 6 : 0, opacity: 0.9 }}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
};


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
const Sidebar = ({ activePage, setActivePage, menuOpen, setMenuOpen }) => (
  <div className={`sidebar${menuOpen ? ' open' : ''}`} style={{
    width: 200, background: SIDEBAR_BG, minHeight: '100vh',
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
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 2 }}>By D.Delseny</p>
        </div>
      </div>
    </div>

    <nav style={{ padding: '16px 12px', flex: 1 }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px', marginBottom: 4 }}>Dashboard</p>
      {[
        { id: 'explorer', label: 'Stock Explorer', icon: <IconSearch /> },
        { id: 'overview', label: 'Market Overview', icon: <IconBarChart /> },
        { id: 'heatmap', label: 'Monthly Heatmap', icon: <IconGrid /> },
        { id: 'correlation', label: 'Correlation', icon: <IconCorrelation /> },
        { id: 'clusters', label: 'Stock Clusters', icon: <IconCluster /> },
        { id: 'info', label: 'Stock Info', icon: <IconInfo /> },
      ].map(({ id, label, icon }) => {
        const active = activePage === id;
        return (
          <div key={id} onClick={() => { setActivePage(id); setMenuOpen(false); }} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8, marginBottom: 2, cursor: 'pointer',
            background: active ? 'rgba(22,119,255,0.15)' : 'transparent',
            color: active ? '#56B4E9' : 'rgba(255,255,255,0.5)',
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

// ── Period filter buttons ──────────────────────────────────
// Used by Correlation page (unchanged)
const PERIODS = [
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
  { label: 'All', days: null },
];

// Used by Overview and Explorer (includes short periods)
const PERIODS_EXTENDED = [
  { label: '1M', days: 30 },
  ...PERIODS,
];

const PeriodFilter = ({ selected, onChange, periods = PERIODS }) => (
  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
    {periods.map(p => (
      <button key={p.label} onClick={() => onChange(p.days)} style={{
        padding: '5px 12px', borderRadius: 6, border: '1px solid',
        borderColor: selected === p.days ? BLUE : '#d9d9d9',
        background: selected === p.days ? BLUE : '#fff',
        color: selected === p.days ? '#fff' : '#8c8c8c',
        fontWeight: selected === p.days ? 600 : 400,
        fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        transition: 'all 0.15s'
      }}>{p.label}</button>
    ))}
  </div>
);

// ── Risk/Return Scatter Plot ───────────────────────────────
const tickerColor = (ticker) => {
  for (const [, cat] of Object.entries(CATEGORIES)) {
    if (cat.tickers.includes(ticker)) return cat.color;
  }
  return '#8c8c8c';
};

const ScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const info = STOCK_INFO.find(s => s.ticker === d.ticker);
  return (
    <div style={{
      background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8,
      padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13,
      maxWidth: 280
    }}>
      <p style={{ fontWeight: 700, color: '#1e2a3a', marginBottom: 2 }}>{d.ticker}</p>
      {info && <p style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 8 }}>{info.company} · {info.sector}</p>}
      <p style={{ color: GREEN, marginBottom: 2 }}>Annualised return: <strong>{d.y > 0 ? '+' : ''}{d.y}%</strong></p>
      {d.rawReturn !== undefined && d.rawReturn !== d.y && (
        <p style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 2 }}>Period return: {d.rawReturn > 0 ? '+' : ''}{d.rawReturn}%</p>
      )}
      <p style={{ color: ORANGE, marginBottom: info ? 8 : 0 }}>Volatility: <strong>{d.x}%</strong></p>
      {info && <p style={{ color: '#595959', fontSize: 12, lineHeight: 1.5, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>{info.description}</p>}
    </div>
  );
};

// Australian 10-year government bond yield used as the risk-free rate threshold.
// A stock whose annualised return falls below this line does not compensate for equity risk.
const RISK_FREE_RATE = 4.0;

const RiskReturnScatter = ({ data, volatility, axisLimits, days, fixedAvgVol }) => {
  const volMap = {};
  volatility.forEach(v => { volMap[v.ticker] = v.volatility_std; });

  // Annualise returns so all periods are comparable on the same scale.
  // "All" period (days = null) is left as-is since the horizon is undefined.
  const annFactor = days ? 365 / days : 1;

  const points = data
    .filter(d => volMap[d.ticker] != null)
    .map((d) => ({
      ticker: d.ticker,
      x: parseFloat(volMap[d.ticker]),
      y: parseFloat((parseFloat(d.total_return_pct) * annFactor).toFixed(1)),
      rawReturn: parseFloat(d.total_return_pct),
      color: tickerColor(d.ticker),
    }));

  // Fixed reference lines:
  // - Vertical: long-term average volatility from "All" period (structural baseline)
  // - Horizontal: 4% risk-free rate (Australian 10Y government bond yield)
  const refVol = fixedAvgVol ?? 0;
  const refRet = RISK_FREE_RATE;

  const xDomain = axisLimits ? [axisLimits.xMin, axisLimits.xMax] : ['auto', 'auto'];
  const yDomain = axisLimits ? [axisLimits.yMin, axisLimits.yMax] : ['auto', 'auto'];

  // Custom dot with ticker label
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill={payload.color} fillOpacity={0.9} stroke="#fff" strokeWidth={1.5} />
        <text x={cx} y={cy - 12} textAnchor="middle" fontSize={10} fill={payload.color} fontWeight={600}>
          {payload.ticker.replace('.AX', '')}
        </text>
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={460}>
      <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          type="number" dataKey="x" name="Volatility"
          tick={{ fontSize: 11, fill: '#8c8c8c' }} axisLine={false} tickLine={false}
          tickFormatter={v => `${v}%`} domain={xDomain} allowDataOverflow={true}
        >
          <Label value="← Lower risk    Volatility (%)    Higher risk →" offset={-10} position="insideBottom" style={{ fontSize: 11, fill: '#8c8c8c' }} />
        </XAxis>
        <YAxis
          type="number" dataKey="y" name="Return"
          tick={{ fontSize: 11, fill: '#8c8c8c' }} axisLine={false} tickLine={false}
          tickFormatter={v => `${v}%`} domain={yDomain} allowDataOverflow={true}
        >
          <Label value="Annualised Return (%)" angle={-90} position="insideLeft" style={{ fontSize: 11, fill: '#8c8c8c' }} />
        </YAxis>
        <ZAxis range={[60, 60]} />
        <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        {/* SVG gradient definitions — each gradient originates from the chart-centre corner
            of its quadrant (transparent) and darkens toward the outer corner. */}
        <Customized component={() => (
          <defs>
            <linearGradient id="gradIdeal"      x1="1" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#009E73" stopOpacity="0"/><stop offset="100%" stopColor="#009E73" stopOpacity="0.35"/></linearGradient>
            <linearGradient id="gradAggressive" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#E69F00" stopOpacity="0"/><stop offset="100%" stopColor="#E69F00" stopOpacity="0.35"/></linearGradient>
            <linearGradient id="gradTrap"       x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#CC79A7" stopOpacity="0"/><stop offset="100%" stopColor="#CC79A7" stopOpacity="0.35"/></linearGradient>
            <linearGradient id="gradAvoid"      x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#cc0000" stopOpacity="0.1"/><stop offset="100%" stopColor="#cc0000" stopOpacity="0.55"/></linearGradient>
          </defs>
        )} />
        {/* Quadrant background shading — all 4 quadrants */}
        <ReferenceArea x1={xDomain[0]} x2={refVol} y1={refRet} y2={yDomain[1]} fill="url(#gradIdeal)"      stroke="none" />
        <ReferenceArea x1={refVol} x2={xDomain[1]} y1={refRet} y2={yDomain[1]} fill="url(#gradAggressive)" stroke="none" />
        <ReferenceArea x1={xDomain[0]} x2={refVol} y1={yDomain[0]} y2={refRet} fill="url(#gradTrap)"       stroke="none" />
        <ReferenceArea x1={refVol} x2={xDomain[1]} y1={yDomain[0]} y2={refRet} fill="url(#gradAvoid)"      stroke="none" />

        {/* Quadrant lines — based on all stocks, fixed regardless of category filter */}
        <ReferenceLine x={refVol} stroke="#b0b0b0" strokeWidth={2} strokeDasharray="6 3" />
        <ReferenceLine y={refRet} stroke="#b0b0b0" strokeWidth={2} strokeDasharray="6 3"
          label={(props) => {
            const { viewBox } = props;
            return (
              <g>
                <text x={viewBox.x + 8} y={viewBox.y - 8} fontSize={12} fill="#009E73" fontWeight={700}>Ideal ↖</text>
                <text x={viewBox.x + viewBox.width - 8} y={viewBox.y - 8} fontSize={12} fill="#E69F00" fontWeight={700} textAnchor="end">↗ Aggressive</text>
                <text x={viewBox.x + 8} y={viewBox.y + 18} fontSize={12} fill="#CC79A7" fontWeight={700}>Trap ↙</text>
                <text x={viewBox.x + viewBox.width - 8} y={viewBox.y + 18} fontSize={12} fill="#cc0000" fontWeight={700} textAnchor="end">↘ Avoid</text>
              </g>
            );
          }}
        />
        <Scatter data={points} shape={<CustomDot />} isAnimationActive={false} />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

// ── Page: Market Overview ──────────────────────────────────
const PageOverview = ({ summary }) => {
  const [days, setDays] = useState(null);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCats, setSelectedCats] = useState(new Set(Object.keys(CATEGORIES)));

  const toggleCat = (cat) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) { next.delete(cat); } else { next.add(cat); }
      return next;
    });
  };
  const allSelected = selectedCats.size === Object.keys(CATEGORIES).length;
  const toggleAll = () => setSelectedCats(
    allSelected ? new Set() : new Set(Object.keys(CATEGORIES))
  );

  useEffect(() => {
    const prefetchAll = async () => {
      setLoading(true);
      const results = await Promise.all(
        PERIODS_EXTENDED.map(p =>
          Promise.all([fetchTopPerformers(p.days), fetchVolatilityAnalysis(p.days)])
            .then(([tp, vol]) => ({ key: String(p.days), tp, vol }))
        )
      );
      const newCache = {};
      results.forEach(({ key, tp, vol }) => {
        newCache[key] = { topPerformers: tp, volatility: vol };
      });
      setCache(newCache);
      setLoading(false);
    };
    prefetchAll();
  }, []);

  const cacheKey = String(days);
  const topPerformers = cache[cacheKey]?.topPerformers || [];
  const volatility = cache[cacheKey]?.volatility || [];

  // Compute fixed axis limits across ALL periods so scales don't jump.
  // Returns are annualised (× 365/days) so all periods share the same Y scale.
  const axisLimits = React.useMemo(() => {
    const allVol = [], allRet = [];
    Object.entries(cache).forEach(([key, { topPerformers: tp, volatility: vol }]) => {
      const periodDays = key === 'null' ? null : parseInt(key);
      const annFactor = periodDays ? 365 / periodDays : 1;
      const volMap = {};
      vol.forEach(v => { volMap[v.ticker] = parseFloat(v.volatility_std); });
      tp.forEach(d => {
        if (volMap[d.ticker] != null) {
          allVol.push(volMap[d.ticker]);
          allRet.push(parseFloat(d.total_return_pct) * annFactor);
        }
      });
    });
    if (!allVol.length) return null;
    const pad = (range) => range * 0.1;
    const minVol = Math.min(...allVol);
    const maxVol = Math.max(...allVol);
    const minRet = Math.min(...allRet);
    const maxRet = Math.max(...allRet);

    // Fixed volatility reference line — average from "All" period only.
    const allPeriod = cache['null'];
    let fixedAvgVol = null;
    if (allPeriod) {
      const volMap = {};
      allPeriod.volatility.forEach(v => { volMap[v.ticker] = parseFloat(v.volatility_std); });
      const pts = allPeriod.topPerformers.filter(d => volMap[d.ticker] != null);
      if (pts.length) fixedAvgVol = pts.reduce((s, d) => s + volMap[d.ticker], 0) / pts.length;
    }

    return {
      xMin: Math.floor((minVol - pad(maxVol - minVol)) * 10) / 10,
      xMax: Math.ceil((maxVol + pad(maxVol - minVol)) * 10) / 10,
      yMin: Math.min(Math.floor((minRet - pad(maxRet - minRet))), RISK_FREE_RATE - 5),
      yMax: Math.ceil((maxRet + pad(maxRet - minRet))),
      fixedAvgVol,
    };
  }, [cache]);


  return (
  <>
    <div style={{
      background: '#fff', padding: '16px 32px',
      borderBottom: '1px solid #f0f0f0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
    }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e2a3a' }}>ASX Market Overview</h1>
      <p style={{ fontSize: 13, color: '#8c8c8c', marginTop: 2 }}>
        20 stocks · Updated daily after market close
        {summary && ` · Data from ${summary.earliest_date}`}
      </p>
    </div>

    <div style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
      {/* Period filter — above stat cards, same style as Stock Explorer */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
        background: '#fff', borderRadius: 12, padding: '18px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: `1.5px solid ${BLUE_LIGHT}`
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Period</span>
        <div style={{ width: 1, height: 20, background: '#e8e8e8' }} />
        <PeriodFilter selected={days} onChange={setDays} periods={PERIODS_EXTENDED} />
        <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 4 }}>
          {days ? `Last ${PERIODS_EXTENDED.find(p => p.days === days)?.label}` : 'All available data'}
        </span>
      </div>

      {(() => {
        if (!topPerformers.length || !volatility.length) return null;
        const best = [...topPerformers].sort((a, b) => b.total_return_pct - a.total_return_pct)[0];
        const avgReturn = (topPerformers.reduce((s, p) => s + parseFloat(p.total_return_pct), 0) / topPerformers.length).toFixed(1);
        const pctPositive = Math.round(topPerformers.filter(p => p.total_return_pct >= 0).length / topPerformers.length * 100);
        const mostStable = [...volatility].sort((a, b) => a.volatility_std - b.volatility_std)[0];
        const avgPos = avgReturn >= 0;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
            <StatCard
              label="Best Performer"
              value={`${best.ticker.replace('.AX','')} ${best.total_return_pct > 0 ? '+' : ''}${best.total_return_pct}%`}
              icon={<IconTrending />} color={BLUE} bg={BLUE_LIGHT}
            />
            <StatCard
              label="Avg Portfolio Return"
              value={`${avgPos ? '+' : ''}${avgReturn}%`}
              icon={<IconBarChart />}
              color={avgPos ? GREEN : RED} bg={avgPos ? GREEN_LIGHT : RED_LIGHT}
            />
            <StatCard
              label="Stocks in Positive"
              value={`${pctPositive}% (${topPerformers.filter(p => p.total_return_pct >= 0).length}/20)`}
              icon={<IconActivity />}
              color={ORANGE} bg={ORANGE_LIGHT}
            />
            <StatCard
              label="Most Stable"
              value={`${mostStable.ticker.replace('.AX','')} σ ${mostStable.volatility_std}%`}
              icon={<IconZap />} color={PURPLE} bg={PURPLE_LIGHT}
            />
          </div>
        );
      })()}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${BLUE_LIGHT}`, borderTopColor: BLUE, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 28 }}>
            <SectionCard title="Risk / Return — Volatility vs Annualised Return" icon={<IconZap />}
              hint={"Each dot = one stock. X-axis = daily return volatility (σ), Y-axis = annualised return.\nAnnualising makes all periods comparable: a +2% monthly return becomes +24% annualised.\nIdeal ↖ = low volatility + beats risk-free rate. Aggressive ↗ = high volatility + beats risk-free rate.\nTrap ↙ = low volatility but below risk-free rate — deceptively safe-looking. Avoid ↘ = high volatility, below risk-free rate.\nVertical line = long-term average volatility (fixed). Horizontal line = 4% risk-free rate (AU 10Y bond). Dot colour = sector."}
            >
              {/* Category pills — colored */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500 }}>Sector:</span>
                <button onClick={toggleAll} style={{
                  padding: '5px 14px', borderRadius: 20, border: '1px solid #d9d9d9',
                  background: '#fff', color: '#1e2a3a',
                  fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
                }}>{allSelected ? 'Deselect All' : 'Select All'}</button>
                {Object.entries(CATEGORIES).map(([cat, { color }]) => {
                  const active = selectedCats.has(cat);
                  return (
                    <button key={cat} onClick={() => toggleCat(cat)} style={{
                      padding: '5px 14px', borderRadius: 20, border: '1px solid',
                      borderColor: active ? color : '#d9d9d9',
                      background: active ? color : '#fff',
                      color: active ? '#fff' : '#8c8c8c',
                      fontWeight: active ? 600 : 400,
                      fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
                    }}>{cat}</button>
                  );
                })}
              </div>
              <div style={{ marginBottom: 12, display: 'flex', gap: 20, fontSize: 12, flexWrap: 'wrap' }}>
                <span style={{ color: '#009E73', fontWeight: 600 }}>↖ Ideal — low risk, positive return</span>
                <span style={{ color: '#E69F00', fontWeight: 600 }}>↗ Aggressive — high risk, positive return</span>
                <span style={{ color: '#CC79A7', fontWeight: 600 }}>↙ Trap — low volatility, negative return</span>
                <span style={{ color: '#cc0000', fontWeight: 600 }}>↘ Avoid — high risk, negative return</span>
              </div>
              <RiskReturnScatter
                data={topPerformers.filter(d => {
                  const cat = Object.entries(CATEGORIES).find(([, c]) => c.tickers.includes(d.ticker));
                  return cat && selectedCats.has(cat[0]);
                })}
                volatility={volatility.filter(d => {
                  const cat = Object.entries(CATEGORIES).find(([, c]) => c.tickers.includes(d.ticker));
                  return cat && selectedCats.has(cat[0]);
                })}
                axisLimits={axisLimits}
                days={days}
                fixedAvgVol={axisLimits?.fixedAvgVol}
              />
              <p style={{ fontSize: 12, color: '#8c8c8c', lineHeight: 1.7, marginTop: 16, borderTop: '1px solid #f5f5f5', paddingTop: 14 }}>
                Returns are <strong style={{ color: '#1e2a3a' }}>annualised</strong> (scaled to a 12-month equivalent) so that all periods are directly comparable on the same axis.
                A stock returning +2% over one month is plotted at +24% annualised — the same as a stock returning +24% over a full year.
                The <strong style={{ color: '#1e2a3a' }}>vertical line</strong> is fixed at the long-term average daily volatility (computed from all available data) and does not move when you change period.
                The <strong style={{ color: '#1e2a3a' }}>horizontal line</strong> is fixed at <strong style={{ color: '#1e2a3a' }}>4%</strong> — the Australian 10-year government bond yield (risk-free rate). A stock below this line does not compensate for the risk taken relative to a risk-free investment.
                {days === null && ' With "All" selected, the raw cumulative return is shown since the total period length varies per ticker.'}
              </p>
            </SectionCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 0 }}>
            <SectionCard title="Total Return % — Ranked Best to Worst" icon={<IconBarChart />}
              hint={"Return = (last close − first close) / first close × 100.\nRanked from best to worst over the selected period.\nGreen = positive return, red = negative.\nThe period selector above applies to all rows."}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    {['#', 'Ticker', 'Return', 'Start Price', 'End Price'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#8c8c8c', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...topPerformers].sort((a, b) => b.total_return_pct - a.total_return_pct).map((stock, i) => {
                    const pos = stock.total_return_pct >= 0;
                    return (
                      <tr key={stock.ticker} style={{ borderBottom: '1px solid #fafafa', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '11px 12px', color: '#bfbfbf', fontSize: 11, fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: '11px 12px' }}>
                          <span style={{ background: BLUE_LIGHT, color: BLUE, padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>{stock.ticker}</span>
                        </td>
                        <td style={{ padding: '11px 12px', fontWeight: 700, color: pos ? GREEN : RED }}>
                          {pos ? '+' : ''}{stock.total_return_pct}%
                        </td>
                        <td style={{ padding: '11px 12px', color: '#8c8c8c' }}>${stock.start_price}</td>
                        <td style={{ padding: '11px 12px', fontWeight: 600, color: '#1e2a3a' }}>${stock.end_price}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </SectionCard>

            <SectionCard title="Daily Volatility % — Ranked Most to Least" icon={<IconZap />}
              hint={"σ = standard deviation of daily % price changes — higher = more erratic.\nAvg change = mean absolute daily move.\nWorst/Best day = single-session extreme return.\nLower σ generally means lower risk."}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    {['#', 'Ticker', 'Volatility', 'Avg Change', 'Worst Day', 'Best Day'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#8c8c8c', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...volatility].sort((a, b) => b.volatility_std - a.volatility_std).map((stock, i) => (
                    <tr key={stock.ticker} style={{ borderBottom: '1px solid #fafafa', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '11px 12px', color: '#bfbfbf', fontSize: 11, fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ background: RED_LIGHT, color: RED, padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>{stock.ticker}</span>
                      </td>
                      <td style={{ padding: '11px 12px', color: RED, fontWeight: 600 }}>{stock.volatility_std}%</td>
                      <td style={{ padding: '11px 12px', color: ORANGE, fontWeight: 500 }}>{stock.avg_daily_change}%</td>
                      <td style={{ padding: '11px 12px', color: RED }}>{stock.worst_day}%</td>
                      <td style={{ padding: '11px 12px', color: GREEN }}>{stock.best_day}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          </div>
        </>
      )}
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </>
  );
};

// ── Stock Selector with hover tooltip ─────────────────────
const StockSelector = ({ label, value, onChange, color }) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const selectedInfo = STOCK_INFO.find(s => s.ticker === value);
  const selectedCat = Object.entries(CATEGORIES).find(([, c]) => c.tickers.includes(value));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>

      {/* Trigger button */}
      <div onClick={() => setOpen(o => !o)} style={{
        position: 'relative', padding: '9px 14px', borderRadius: 8,
        border: `2px solid ${color}`, fontSize: 14, fontWeight: 700,
        color: '#1e2a3a', cursor: 'pointer', background: '#fff',
        display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none', minWidth: 130
      }}>
        {selectedCat && <span style={{ width: 8, height: 8, borderRadius: '50%', background: selectedCat[1].color, flexShrink: 0 }} />}
        <span>{value.replace('.AX', '')}</span>
        <span style={{ fontSize: 9, color: '#bfbfbf', marginLeft: 'auto' }}>▼</span>

        {/* Dropdown list */}
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={e => { e.stopPropagation(); setOpen(false); setHovered(null); }} />
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
              background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid #e8e8e8', padding: '4px 0', minWidth: 150, maxHeight: 300, overflowY: 'auto'
            }}>
              {ASX_TICKERS.map(t => {
                const cat = Object.entries(CATEGORIES).find(([, c]) => c.tickers.includes(t));
                const catColor = cat ? cat[1].color : '#8c8c8c';
                const isSelected = t === value;
                return (
                  <div key={t}
                    onClick={e => { e.stopPropagation(); onChange(t); setOpen(false); setHovered(null); }}
                    onMouseEnter={e => { setHovered(t); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                    onMouseMove={e => setTooltipPos({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                      fontWeight: isSelected ? 700 : 400,
                      color: isSelected ? catColor : '#1e2a3a',
                      background: isSelected ? catColor + '12' : '#fff',
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'background 0.1s'
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
                    {t.replace('.AX', '')}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Company name + category next to trigger */}
      {selectedInfo && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>{selectedInfo.company}</span>
          {selectedCat && (
            <span style={{
              background: selectedCat[1].color + '22', color: selectedCat[1].color,
              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600
            }}>{selectedCat[0]}</span>
          )}
        </span>
      )}

      {/* Hover tooltip */}
      {hovered && (() => {
        const info = STOCK_INFO.find(s => s.ticker === hovered);
        const cat = Object.entries(CATEGORIES).find(([, c]) => c.tickers.includes(hovered));
        const catColor = cat ? cat[1].color : '#8c8c8c';
        return (
          <div style={{
            position: 'fixed', left: tooltipPos.x + 16, top: tooltipPos.y - 8, zIndex: 1000,
            background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10,
            padding: '12px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            fontSize: 13, maxWidth: 260, pointerEvents: 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: '#1e2a3a', fontSize: 14 }}>{hovered.replace('.AX', '')}</span>
              {cat && <span style={{ background: catColor + '22', color: catColor, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{cat[0]}</span>}
            </div>
            {info && <>
              <p style={{ color: '#595959', fontSize: 12, marginBottom: 6 }}>{info.company}</p>
              <p style={{ color: '#8c8c8c', fontSize: 11, lineHeight: 1.55, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>{info.description}</p>
            </>}
          </div>
        );
      })()}
    </div>
  );
};

// ── Page: Stock Explorer ───────────────────────────────────
const PageExplorer = ({ ticker, setTicker }) => {
  const [cache, setCache] = useState({});   // { 'CBA.AX-null': [...], 'CBA.AX-90': [...] }
  const [explorerDays, setExplorerDays] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const prefetchTicker = async (t) => {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          PERIODS_EXTENDED.map(p =>
            fetchStockHistory(t, p.days).then(data => ({ key: `${t}-${p.days}`, data }))
          )
        );
        const newEntries = {};
        results.forEach(({ key, data }) => { newEntries[key] = data; });
        setCache(prev => ({ ...prev, ...newEntries }));
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    prefetchTicker(ticker);
  }, [ticker]);

  const cacheKey = `${ticker}-${explorerDays}`;
  const priceHistory = React.useMemo(() => cache[cacheKey] || [], [cache, cacheKey]);

  const periodLabel = PERIOD_LABELS[explorerDays] ?? 'All-Period';

  const latest = priceHistory[priceHistory.length - 1] || {};
  const oldest = priceHistory[0] || {};
  const allClose = priceHistory.map(d => d.close).filter(Boolean);
  const maxClose = allClose.length ? Math.max(...allClose) : null;
  const minClose = allClose.length ? Math.min(...allClose) : null;
  const priceChange = latest.close && oldest.close
    ? (((latest.close - oldest.close) / oldest.close) * 100).toFixed(2)
    : null;
  const isPositive = priceChange > 0;

  const tickFormatter = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
  };

  // Monthly bar chart (6M, 1Y, 2Y, All)
  // xLabel: "Jan 2024" for January, "" for other months (tick mark only)
  // tooltip uses fullLabel
  const monthlyBars = React.useMemo(() => {
    if (!priceHistory.length) return [];
    const byMonth = {};
    priceHistory.forEach(d => {
      const m = d.date.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push(d);
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, days]) => {
        const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
        const ret = parseFloat(((sorted[sorted.length-1].close - sorted[0].close) / sorted[0].close * 100).toFixed(2));
        const [year, mon] = month.split('-');
        const d = new Date(parseInt(year), parseInt(mon) - 1, 1);
        const monShort = d.toLocaleDateString('en-AU', { month: 'short' });
        const fullLabel = `${monShort} ${year}`;
        const xLabel = mon === '01' ? `Jan ${year}` : '';
        return { xLabel, fullLabel, ret };
      });
  }, [priceHistory]);

  // Weekly bar chart (1M, 3M)
  // Weeks defined by day-of-month: W1=1–7, W2=8–14, W3=15–21, W4=22–28, W5=29–end
  // xLabel: month name on first week of each new month, "" otherwise
  const weeklyBars = React.useMemo(() => {
    if (!priceHistory.length) return [];
    const byWeek = {};
    priceHistory.forEach(d => {
      const monthKey = d.date.slice(0, 7);
      const day = parseInt(d.date.slice(8, 10));
      const weekNum = Math.ceil(day / 7);
      const key = `${monthKey}-W${weekNum}`;
      if (!byWeek[key]) byWeek[key] = { days: [], monthKey, weekNum };
      byWeek[key].days.push(d);
    });
    const sorted = Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b));
    let prevMonth = null;
    return sorted.map(([, { days, monthKey, weekNum }]) => {
      const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));
      const ret = parseFloat(((sortedDays[sortedDays.length-1].close - sortedDays[0].close) / sortedDays[0].close * 100).toFixed(2));
      const [year, mon] = monthKey.split('-');
      const monName = new Date(parseInt(year), parseInt(mon) - 1, 1).toLocaleDateString('en-AU', { month: 'short' });
      const startDay = (weekNum - 1) * 7 + 1;
      const daysInMonth = new Date(parseInt(year), parseInt(mon), 0).getDate();
      const endDay = Math.min(weekNum * 7, daysInMonth);
      const fullLabel = `Week ${weekNum} · ${monName} ${startDay}–${endDay}`;
      const isNewMonth = monthKey !== prevMonth;
      prevMonth = monthKey;
      const xLabel = isNewMonth ? monName : '';
      return { xLabel, fullLabel, ret };
    });
  }, [priceHistory]);

  const showMonthlyBars = explorerDays === 180 || explorerDays === 365 || explorerDays === 730 || explorerDays === null;
  const showWeeklyBars  = explorerDays === 30 || explorerDays === 90;
  const barData    = showMonthlyBars ? monthlyBars : showWeeklyBars ? weeklyBars : null;
  const barGrouping = showMonthlyBars ? 'Monthly' : 'Weekly';

  return (
    <>
      <div style={{
        background: '#fff', padding: '16px 32px',
        borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e2a3a' }}>Stock Explorer</h1>
        <p style={{ fontSize: 13, color: '#8c8c8c', marginTop: 2 }}>Closing price history · Updated daily after ASX close (4:30 PM Sydney)</p>
      </div>

      <div style={{ padding: '28px 32px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Ticker + Period selector */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28,
          flexWrap: 'wrap', background: '#fff', borderRadius: 12,
          padding: '18px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          border: `1.5px solid ${BLUE_LIGHT}`
        }}>
          <StockSelector label="Stock" value={ticker} onChange={setTicker} color={BLUE} />
          <div style={{ width: 1, height: 32, background: '#e8e8e8' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Period</span>
            <PeriodFilter selected={explorerDays} onChange={setExplorerDays} periods={PERIODS_EXTENDED} />
          </div>
        </div>

        {/* Mini stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
          <StatCard label="Latest Close" value={latest.close ? `$${latest.close.toFixed(2)}` : '—'} icon={<IconDollar />} color={BLUE} bg={BLUE_LIGHT} />
          <StatCard
            label={`${periodLabel} Change`}
            value={priceChange !== null ? `${isPositive ? '+' : ''}${priceChange}%` : '—'}
            icon={<IconTrending />}
            color={isPositive ? GREEN : RED}
            bg={isPositive ? GREEN_LIGHT : RED_LIGHT}
          />
          <StatCard label={`${periodLabel} High`} value={maxClose ? `$${maxClose.toFixed(2)}` : '—'} icon={<IconActivity />} color={PURPLE} bg={PURPLE_LIGHT} />
          <StatCard label={`${periodLabel} Low`} value={minClose ? `$${minClose.toFixed(2)}` : '—'} icon={<IconActivity />} color={ORANGE} bg={ORANGE_LIGHT} />
        </div>

        {/* Line chart */}
        <div style={{ marginBottom: 28 }}>
          <SectionCard title={`Closing Price — ${ticker} (${periodLabel})`} icon={<IconSearch />}
            hint={"Daily closing price over the selected period.\nHover the chart for the exact price on any date.\n% change in the stat cards = (last − first close) / first close × 100.\nGaps may appear on non-trading days (weekends, public holidays)."}
          >
            {loading ? (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 36, height: 36, border: `3px solid ${BLUE_LIGHT}`, borderTopColor: BLUE, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : error ? (
              <p style={{ color: RED, textAlign: 'center', padding: 40 }}>{error}</p>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#8c8c8c' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={tickFormatter}
                    interval={Math.floor(priceHistory.length / 8) || 1}
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

        {/* Monthly / Weekly return bar chart */}
        {barData && barData.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionCard
              title={`${barGrouping} Returns — ${ticker} (${periodLabel})`}
              icon={<IconBarChart />}
              hint={showMonthlyBars
                ? "Each bar = return for one calendar month: (last close − first close) / first close × 100.\nGreen = positive month, red = negative.\nHover a bar for the exact value."
                : "Each bar = return for one trading week (Mon → Fri close).\nGreen = up week, red = down week.\nHover a bar for the exact value."}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ bottom: 24, left: 10, right: 10 }} barSize={showMonthlyBars ? 16 : 12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="xLabel"
                    interval={0}
                    tick={({ x, y, payload }) => {
                      if (!payload.value) {
                        return <line x1={x} y1={y} x2={x} y2={y + 4} stroke="#d9d9d9" strokeWidth={1} />;
                      }
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <line x1={0} y1={0} x2={0} y2={4} stroke="#8c8c8c" strokeWidth={1} />
                          <text x={0} y={10} dy={4} textAnchor="middle" fontSize={10} fontWeight={600} fill="#1e2a3a">{payload.value}</text>
                        </g>
                      );
                    }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#8c8c8c' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
                  />
                  <ReferenceLine y={0} stroke="#8c8c8c" strokeWidth={1.5} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13 }}>
                          <p style={{ fontWeight: 700, color: '#1e2a3a', marginBottom: 4 }}>{d.fullLabel}</p>
                          <p style={{ color: d.ret >= 0 ? GREEN : RED, fontWeight: 600 }}>{d.ret > 0 ? '+' : ''}{d.ret}%</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="ret" name="Return"
                    shape={(props) => {
                      const { x, y, width, height, value } = props;
                      const r = 3;
                      const pos = value >= 0;
                      return (
                        <path
                          d={pos
                            ? `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`
                            : `M${x},${y} L${x},${y + height - r} Q${x},${y + height} ${x + r},${y + height} L${x + width - r},${y + height} Q${x + width},${y + height} ${x + width},${y + height - r} L${x + width},${y} Z`
                          }
                          fill={pos ? GREEN : RED}
                          fillOpacity={0.85}
                        />
                      );
                    }}
                  >
                    {barData.map((_, i) => (
                      <Cell key={i} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        )}

        {/* Last 10 sessions table */}
        <SectionCard title="Last 10 Sessions" icon={<IconBarChart />}
          hint={"OHLC: Open = first trade of the day, High/Low = intraday extremes, Close = last trade.\nGreen close = up day (close ≥ open), red = down day.\nVolume = total number of shares traded that day.\nMost recent session shown first."}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                {['Date', 'Open', 'High', 'Low', 'Close', 'Volume'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#8c8c8c', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...priceHistory].reverse().slice(0, 10).map((row, i) => {
                const up = row.close >= row.open;
                return (
                  <tr key={row.date} style={{ borderBottom: '1px solid #fafafa', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500, color: '#1e2a3a' }}>{row.date}</td>
                    <td style={{ padding: '10px 12px', color: '#8c8c8c' }}>${row.open?.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', color: GREEN }}>${row.high?.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', color: RED }}>${row.low?.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: up ? GREEN : RED }}>${row.close?.toFixed(2)}</td>
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

// ── Page: Stock Info ───────────────────────────────────────
const PageStockInfo = () => {
  const [filterCat, setFilterCat] = useState('All');

  const displayed = filterCat === 'All'
    ? STOCK_INFO
    : STOCK_INFO.filter(s => CATEGORIES[filterCat]?.tickers.includes(s.ticker));

  return (
    <>
      <div style={{
        background: '#fff', padding: '16px 32px',
        borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e2a3a' }}>Stock Info</h1>
        <p style={{ fontSize: 13, color: '#8c8c8c', marginTop: 2 }}>Overview of the 20 ASX stocks tracked</p>
      </div>

      <div style={{ padding: 32, maxWidth: 1280, margin: '0 auto' }}>
        {/* Sector filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500 }}>Sector:</span>
          {['All', ...Object.keys(CATEGORIES)].map(cat => {
            const color = cat === 'All' ? BLUE : CATEGORIES[cat].color;
            const active = filterCat === cat;
            return (
              <button key={cat} onClick={() => setFilterCat(cat)} style={{
                padding: '5px 14px', borderRadius: 20, border: '1px solid',
                borderColor: active ? color : '#d9d9d9',
                background: active ? color : '#fff',
                color: active ? '#fff' : '#8c8c8c',
                fontWeight: active ? 600 : 400,
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s'
              }}>{cat}</button>
            );
          })}
        </div>

        <SectionCard title={`${displayed.length} stocks`} icon={<IconInfo />}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                {['Ticker', 'Company', 'Sector', 'Description'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#8c8c8c', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((stock, i) => {
                const catEntry = Object.entries(CATEGORIES).find(([, c]) => c.tickers.includes(stock.ticker));
                const catColor = catEntry ? catEntry[1].color : BLUE;
                const catBg = catColor + '22';
                return (
                  <tr key={stock.ticker} style={{ borderBottom: '1px solid #fafafa', background: i % 2 === 0 ? '#fff' : '#fafafa', verticalAlign: 'top' }}>
                    <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ background: catBg, color: catColor, padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>{stock.ticker}</span>
                    </td>
                    <td style={{ padding: '14px 12px', fontWeight: 600, color: '#1e2a3a', whiteSpace: 'nowrap' }}>{stock.company}</td>
                    <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                      <span
                        onClick={() => setFilterCat(catEntry ? catEntry[0] : 'All')}
                        style={{ background: catBg, color: catColor, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.target.style.background = catColor; e.target.style.color = '#fff'; }}
                        onMouseLeave={e => { e.target.style.background = catBg; e.target.style.color = catColor; }}
                      >{stock.sector}</span>
                    </td>
                    <td style={{ padding: '14px 12px', color: '#595959', lineHeight: 1.6 }}>{stock.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </>
  );
};

// ── Page: Monthly Heatmap ─────────────────────────────────
const PageHeatmap = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState(null); // { ticker, x, y }

  useEffect(() => {
    fetchMonthlyReturns()
      .then(setData)
      .catch(() => setError('Failed to load heatmap data'))
      .finally(() => setLoading(false));
  }, []);

  const [selectedCats, setSelectedCats] = useState(new Set(Object.keys(CATEGORIES)));

  const toggleCat = (cat) => setSelectedCats(prev => {
    const next = new Set(prev);
    if (next.has(cat)) { next.delete(cat); } else { next.add(cat); }
    return next;
  });
  const allSelected = selectedCats.size === Object.keys(CATEGORIES).length;
  const toggleAll = () => setSelectedCats(allSelected ? new Set() : new Set(Object.keys(CATEGORIES)));

  // Build months list and ticker list from data
  const months = [...new Set(data.map(d => d.month))].sort().reverse();
  const tickers = ASX_TICKERS.filter(t => {
    const cat = Object.entries(CATEGORIES).find(([, c]) => c.tickers.includes(t));
    return cat && selectedCats.has(cat[0]);
  });

  // Lookup map: ticker+month → return
  const lookup = {};
  data.forEach(d => { lookup[`${d.ticker}-${d.month}`] = d.monthly_return; });

  // Diverging palette: neutral white at 0, deep green → +10%, deep red → -10%
  const cellColor = (val) => {
    if (val == null) return '#eeeeee';
    const t = Math.min(1, Math.abs(val) / 10);
    if (val >= 0) {
      return `rgb(${Math.round(247 - t * 221)},${Math.round(247 - t * 125)},${Math.round(247 - t * 185)})`;
    } else {
      return `rgb(${Math.round(247 - t * 55)},${Math.round(247 - t * 190)},${Math.round(247 - t * 204)})`;
    }
  };

  // Format month label: always show "Mon YYYY", bold kept for January via fontWeight in cell
  const monthLabel = (m) => {
    const [year, month] = m.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    const mon = d.toLocaleDateString('en-AU', { month: 'short' });
    return `${mon} ${year}`;
  };


  return (
    <>
      <div style={{
        background: '#fff', padding: '16px 32px',
        borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e2a3a' }}>Monthly Returns Heatmap</h1>
        <p style={{ fontSize: 13, color: '#8c8c8c', marginTop: 2 }}>Monthly return % per stock · Green = positive · Red = negative · Intensity = magnitude</p>
      </div>

      <div style={{ padding: 32, maxWidth: '100%', margin: '0 auto', position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${BLUE_LIGHT}`, borderTopColor: BLUE, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : error ? (
          <p style={{ color: RED, textAlign: 'center', padding: 40 }}>{error}</p>
        ) : (
          <>
          <SectionCard title="Monthly Return % per Stock" icon={<IconGrid />}
            hint={"Each cell = monthly return for one stock (%).\nGreen = positive month, red = negative. Intensity = magnitude (capped at ±10%).\nHover a ticker header to see company info.\nMost recent month at the top."}
          >
            {/* Category filter — colored pills, same as Market Overview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500 }}>Sector:</span>
              <button onClick={toggleAll} style={{
                padding: '5px 14px', borderRadius: 20, border: '1px solid #d9d9d9',
                background: '#fff', color: '#1e2a3a',
                fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
              }}>{allSelected ? 'Deselect All' : 'Select All'}</button>
              {Object.entries(CATEGORIES).map(([cat, { color }]) => {
                const active = selectedCats.has(cat);
                return (
                  <button key={cat} onClick={() => toggleCat(cat)} style={{
                    padding: '5px 14px', borderRadius: 20, border: '1px solid',
                    borderColor: active ? color : '#d9d9d9',
                    background: active ? color : '#fff',
                    color: active ? '#fff' : '#8c8c8c',
                    fontWeight: active ? 600 : 400,
                    fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
                  }}>{cat}</button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#595959', marginBottom: 8 }}>Monthly Return</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#BF3A2B', minWidth: 42, textAlign: 'right' }}>≤ −10%</span>
                <div style={{ position: 'relative', height: 18, width: 280, borderRadius: 6, overflow: 'hidden', border: '1px solid #e0e0e0', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, rgb(192,57,43), rgb(247,247,247), rgb(26,122,62))` }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1A7A3E', minWidth: 42 }}>≥ +10%</span>
              </div>
              <div style={{ display: 'flex', gap: 0, width: 280, marginLeft: 52, marginTop: 4, justifyContent: 'space-between' }}>
                {['−5%', '0%', '+5%'].map(l => (
                  <span key={l} style={{ fontSize: 10, color: '#8c8c8c' }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Custom tooltip */}
            {tooltip && (() => {
              const info = STOCK_INFO.find(s => s.ticker === tooltip.ticker);
              const catEntry = Object.entries(CATEGORIES).find(([, c]) => c.tickers.includes(tooltip.ticker));
              const catColor = catEntry ? catEntry[1].color : '#8c8c8c';
              return (
                <div style={{
                  position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 10, zIndex: 1000,
                  background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8,
                  padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: 13, maxWidth: 280, pointerEvents: 'none'
                }}>
                  <p style={{ fontWeight: 700, color: '#1e2a3a', marginBottom: 2 }}>{tooltip.ticker}</p>
                  {info && <p style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 8 }}>{info.company}
                    <span style={{ marginLeft: 6, background: catColor + '22', color: catColor, padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{info.sector}</span>
                  </p>}
                  {info && <p style={{ color: '#595959', fontSize: 12, lineHeight: 1.5, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>{info.description}</p>}
                </div>
              );
            })()}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ width: 108, textAlign: 'left', padding: '6px 10px', color: '#8c8c8c', fontWeight: 600, position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>Month</th>
                    {tickers.map(ticker => {
                      const catEntry = Object.entries(CATEGORIES).find(([, c]) => c.tickers.includes(ticker));
                      const catColor = catEntry ? catEntry[1].color : '#8c8c8c';
                      return (
                        <th key={ticker}
                          onMouseEnter={e => setTooltip({ ticker, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setTooltip(null)}
                          style={{ minWidth: 36, textAlign: 'center', padding: '6px 2px', color: catColor, fontWeight: 700, whiteSpace: 'nowrap', fontSize: 11, cursor: 'help' }}>
                          {ticker.replace('.AX', '')}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {months.map(m => (
                    <tr key={m}>
                      <td style={{
                        padding: '4px 10px', fontWeight: m.endsWith('-01') ? 700 : 400,
                        fontSize: 11, color: m.endsWith('-01') ? '#1e2a3a' : '#8c8c8c',
                        whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#fff', zIndex: 1
                      }}>
                        {monthLabel(m)}
                      </td>
                      {tickers.map(ticker => {
                        const val = lookup[`${ticker}-${m}`];
                        return (
                          <td key={ticker} title={val != null ? `${ticker} ${m}: ${val > 0 ? '+' : ''}${val}%` : 'No data'}
                            style={{
                              background: cellColor(val),
                              padding: '6px 0', borderRadius: 3,
                              minWidth: 36, cursor: 'default',
                            }}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

// ── CCF computation ───────────────────────────────────────
const computeCCF = (series1, series2, maxLag = 20) => {
  // Align by date
  const map2 = {};
  series2.forEach(d => { map2[d.date] = d.ret; });
  const aligned = series1.filter(d => map2[d.date] != null).map(d => ({ ret1: d.ret, ret2: map2[d.date] }));
  if (aligned.length < 10) return [];

  const n = aligned.length;
  const mean1 = aligned.reduce((s, d) => s + d.ret1, 0) / n;
  const mean2 = aligned.reduce((s, d) => s + d.ret2, 0) / n;
  const std1 = Math.sqrt(aligned.reduce((s, d) => s + (d.ret1 - mean1) ** 2, 0) / n);
  const std2 = Math.sqrt(aligned.reduce((s, d) => s + (d.ret2 - mean2) ** 2, 0) / n);

  const result = [];
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let sum = 0, count = 0;
    for (let i = 0; i < n; i++) {
      const j = i + lag;
      if (j >= 0 && j < n) {
        sum += (aligned[i].ret1 - mean1) * (aligned[j].ret2 - mean2);
        count++;
      }
    }
    result.push({ lag, ccf: parseFloat((sum / (count * std1 * std2)).toFixed(4)) });
  }
  return result;
};

const dailyReturns = (priceData) => {
  const sorted = [...priceData].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(1).map((d, i) => ({
    date: d.date,
    ret: sorted[i].close > 0 ? (d.close - sorted[i].close) / sorted[i].close * 100 : 0
  }));
};

// ── Page: Correlation ──────────────────────────────────────
const PageCorrelation = () => {
  const [ticker1, setTicker1] = useState('CBA.AX');
  const [ticker2, setTicker2] = useState('BHP.AX');
  const [corrDays, setCorrDays] = useState(null);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async (t) => {
      if (cache[t]) return;
      try {
        const data = await fetchStockHistory(t, null);
        setCache(prev => ({ ...prev, [t]: data }));
      } catch { setError('Failed to load data'); }
    };
    setLoading(true);
    Promise.all([load(ticker1), load(ticker2)]).finally(() => setLoading(false));
  }, [ticker1, ticker2]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterByDays = (data) => {
    if (!corrDays || !data) return data || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - corrDays);
    return data.filter(d => new Date(d.date) >= cutoff);
  };

  const data1 = filterByDays(cache[ticker1]);
  const data2 = filterByDays(cache[ticker2]);
  const ret1 = React.useMemo(() => data1.length ? dailyReturns(data1) : [], [data1]);
  const ret2 = React.useMemo(() => data2.length ? dailyReturns(data2) : [], [data2]);
  const ccfData = React.useMemo(() => ret1.length && ret2.length ? computeCCF(ret1, ret2) : [], [ret1, ret2]);
  const lag0 = ccfData.find(d => d.lag === 0)?.ccf ?? null;

  // Monthly lag-0 correlation
  const monthlyCorr = React.useMemo(() => {
    if (!ret1.length || !ret2.length) return [];
    const map2 = {};
    ret2.forEach(d => { map2[d.date] = d.ret; });
    const byMonth = {};
    ret1.forEach(d => {
      if (map2[d.date] == null) return;
      const m = d.date.slice(0, 7); // YYYY-MM
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push({ ret1: d.ret, ret2: map2[d.date] });
    });
    return Object.entries(byMonth)
      .filter(([, pts]) => pts.length >= 5)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, pts]) => {
        const n = pts.length;
        const m1 = pts.reduce((s, p) => s + p.ret1, 0) / n;
        const m2 = pts.reduce((s, p) => s + p.ret2, 0) / n;
        const std1 = Math.sqrt(pts.reduce((s, p) => s + (p.ret1 - m1) ** 2, 0) / n) || 1;
        const std2 = Math.sqrt(pts.reduce((s, p) => s + (p.ret2 - m2) ** 2, 0) / n) || 1;
        const corr = parseFloat((pts.reduce((s, p) => s + (p.ret1 - m1) * (p.ret2 - m2), 0) / (n * std1 * std2)).toFixed(3));
        return { month, corr, n };
      });
  }, [ret1, ret2]);
  const periodLabel = PERIOD_LABELS[corrDays] ?? 'All-Period';
  const info1 = STOCK_INFO.find(s => s.ticker === ticker1);
  const info2 = STOCK_INFO.find(s => s.ticker === ticker2);
  const cat1 = Object.entries(CATEGORIES).find(([, c]) => c.tickers.includes(ticker1));
  const cat2 = Object.entries(CATEGORIES).find(([, c]) => c.tickers.includes(ticker2));
  const color1 = cat1 ? cat1[1].color : BLUE;
  const color2 = cat2 ? cat2[1].color : ORANGE;

  // Significance threshold: ±2/sqrt(n)
  const n = Math.min(ret1.length, ret2.length);
  const sigThreshold = n > 0 ? parseFloat((2 / Math.sqrt(n)).toFixed(4)) : 0.1;



  return (
    <>
      <div style={{ background: '#fff', padding: '16px 32px', borderBottom: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e2a3a' }}>Cross-Correlation Analysis</h1>
        <p style={{ fontSize: 13, color: '#8c8c8c', marginTop: 2 }}>Measures how two stocks move together at different time lags · Lag 0 = same day</p>
      </div>

      <div style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
        {/* Controls card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28,
          flexWrap: 'wrap', background: '#fff', borderRadius: 12,
          padding: '18px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          border: `1.5px solid ${BLUE_LIGHT}`
        }}>
          <StockSelector label="Stock A" value={ticker1} onChange={setTicker1} color={color1} info={info1} />
          <div style={{ width: 1, height: 32, background: '#e8e8e8' }} />
          <StockSelector label="Stock B" value={ticker2} onChange={setTicker2} color={color2} info={info2} />
          <div style={{ width: 1, height: 32, background: '#e8e8e8' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Period</span>
            <PeriodFilter selected={corrDays} onChange={setCorrDays} />
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
          <StatCard
            label={`Correlation at Lag 0 (${periodLabel})`}
            value={lag0 !== null ? lag0.toFixed(3) : '—'}
            icon={<IconCorrelation />}
            color={lag0 !== null ? (Math.abs(lag0) > sigThreshold ? (lag0 > 0 ? GREEN : RED) : ORANGE) : BLUE}
            bg={lag0 !== null ? (Math.abs(lag0) > sigThreshold ? (lag0 > 0 ? GREEN_LIGHT : RED_LIGHT) : ORANGE_LIGHT) : BLUE_LIGHT}
          />
          <StatCard label="Trading Days" value={n > 0 ? n : '—'} icon={<IconActivity />} color={PURPLE} bg={PURPLE_LIGHT} />
          <StatCard label="Significance Threshold" value={`±${sigThreshold}`} icon={<IconZap />} color={ORANGE} bg={ORANGE_LIGHT} />
          <StatCard
            label="Interpretation"
            value={lag0 !== null ? (Math.abs(lag0) > sigThreshold ? (lag0 > 0.6 ? 'Strong +' : lag0 > 0.3 ? 'Moderate +' : lag0 < -0.3 ? 'Negative' : 'Weak') : 'Not significant') : '—'}
            icon={<IconTrending />} color={BLUE} bg={BLUE_LIGHT}
          />
        </div>

        {/* CCF Chart */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${BLUE_LIGHT}`, borderTopColor: BLUE, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : error ? (
          <p style={{ color: RED, textAlign: 'center', padding: 40 }}>{error}</p>
        ) : ccfData.length > 0 ? (
          <SectionCard title={`CCF — ${ticker1.replace('.AX','')} vs ${ticker2.replace('.AX','')} · Lags -20 to +20`} icon={<IconCorrelation />}
            hint={"Each bar = Pearson cross-correlation at a given lag (trading days).\nLag 0 = same-day correlation (blue bar).\nPositive lag: Stock A leads B. Negative lag: B leads A.\nOrange dashes = significance threshold (±2/√n).\nGreen/red bars = statistically significant."}
          >
            <p style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 16 }}>
              Positive lag: <strong>{ticker1.replace('.AX','')}</strong> leads <strong>{ticker2.replace('.AX','')}</strong> ·
              Negative lag: <strong>{ticker2.replace('.AX','')}</strong> leads · Dashed lines = significance threshold (±{sigThreshold})
            </p>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={ccfData} barSize={14} margin={{ bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="lag" tick={{ fontSize: 11, fill: '#8c8c8c' }} axisLine={false} tickLine={false}>
                  <Label value="Lag (days)" offset={-10} position="insideBottom" style={{ fontSize: 11, fill: '#8c8c8c' }} />
                </XAxis>
                <YAxis tick={{ fontSize: 11, fill: '#8c8c8c' }} axisLine={false} tickLine={false} domain={[-1, 1]} tickFormatter={v => v.toFixed(1)} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const sig = Math.abs(d.ccf) > sigThreshold;
                  return (
                    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13 }}>
                      <p style={{ fontWeight: 700, color: '#1e2a3a', marginBottom: 4 }}>Lag {d.lag > 0 ? `+${d.lag}` : d.lag}</p>
                      <p style={{ color: d.ccf >= 0 ? GREEN : RED }}>CCF: <strong>{d.ccf}</strong></p>
                      <p style={{ fontSize: 11, color: sig ? (d.ccf > 0 ? GREEN : RED) : '#8c8c8c', marginTop: 4 }}>{sig ? (d.ccf > 0 ? '✓ Significant positive' : '✓ Significant negative') : 'Not significant'}</p>
                    </div>
                  );
                }} />
                <ReferenceLine y={sigThreshold} stroke={ORANGE} strokeDasharray="4 4" strokeWidth={1.5} />
                <ReferenceLine y={-sigThreshold} stroke={ORANGE} strokeDasharray="4 4" strokeWidth={1.5} />
                <ReferenceLine y={0} stroke="#d9d9d9" strokeWidth={1} />
                <Bar dataKey="ccf" name="CCF" radius={[3, 3, 0, 0]}>
                  {ccfData.map((d) => (
                    <Cell key={d.lag} fill={
                      d.lag === 0 ? BLUE :
                      Math.abs(d.ccf) > sigThreshold ? (d.ccf > 0 ? GREEN : RED) : '#d0d0d0'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        ) : null}

        {/* Monthly correlation chart */}
        {monthlyCorr.length > 1 && (
          <div style={{ marginTop: 24 }}>
          <SectionCard title={`Monthly Correlation at Lag 0 — ${ticker1.replace('.AX','')} vs ${ticker2.replace('.AX','')}`} icon={<IconCorrelation />}
            hint={"Pearson correlation of daily returns computed separately per calendar month.\nShows whether the relationship is stable or evolves over time.\nA rising trend = stocks are becoming more correlated.\nOrange dashes = significance threshold (±2/√n)."}
          >
            <p style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 16 }}>
              Pearson correlation of daily returns computed separately for each calendar month · Dashed lines = significance threshold
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyCorr} margin={{ bottom: 30, left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8c8c8c' }} axisLine={false} tickLine={false} angle={-40} textAnchor="end" interval="preserveStartEnd">
                  <Label value="Month" offset={-18} position="insideBottom" style={{ fontSize: 11, fill: '#8c8c8c' }} />
                </XAxis>
                <YAxis tick={{ fontSize: 11, fill: '#8c8c8c' }} axisLine={false} tickLine={false} domain={[-1, 1]} tickFormatter={v => v.toFixed(1)} />
                <ReferenceLine y={sigThreshold} stroke={ORANGE} strokeDasharray="4 4" strokeWidth={1.5} />
                <ReferenceLine y={-sigThreshold} stroke={ORANGE} strokeDasharray="4 4" strokeWidth={1.5} />
                <ReferenceLine y={0} stroke="#d9d9d9" strokeWidth={1} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const sig = Math.abs(d.corr) > sigThreshold;
                  return (
                    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13 }}>
                      <p style={{ fontWeight: 700, color: '#1e2a3a', marginBottom: 4 }}>{d.month}</p>
                      <p style={{ color: d.corr >= 0 ? GREEN : RED }}>Correlation: <strong>{d.corr}</strong></p>
                      <p style={{ fontSize: 11, color: '#8c8c8c' }}>{d.n} trading days</p>
                      <p style={{ fontSize: 11, color: sig ? (d.corr > 0 ? GREEN : RED) : '#8c8c8c', marginTop: 4 }}>{sig ? (d.corr > 0 ? '✓ Significant positive' : '✓ Significant negative') : 'Not significant'}</p>
                    </div>
                  );
                }} />
                <Line type="monotone" dataKey="corr" stroke={BLUE} strokeWidth={2} dot={{ r: 3, fill: BLUE, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

// ── Correlation Circle (SVG) ──────────────────────────────
const CorrelCircle = ({ data }) => {
  const [hov, setHov] = useState(null);
  const size = 420, cx = 210, cy = 210, rad = 158;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        <circle cx={cx} cy={cy} r={rad} fill="none" stroke="#e8e8e8" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={rad / 2} fill="none" stroke="#f0f0f0" strokeWidth={1} strokeDasharray="3 3" />
        <line x1={cx - rad - 16} y1={cy} x2={cx + rad + 16} y2={cy} stroke="#e0e0e0" strokeDasharray="4 4" />
        <line x1={cx} y1={cy - rad - 16} x2={cx} y2={cy + rad + 16} stroke="#e0e0e0" strokeDasharray="4 4" />
        <text x={cx + rad + 10} y={cy + 4} fontSize={10} fill="#8c8c8c" fontWeight={600}>PC1 +</text>
        <text x={cx - rad - 10} y={cy + 4} fontSize={10} fill="#8c8c8c" textAnchor="end">− PC1</text>
        <text x={cx} y={cy - rad - 10} fontSize={10} fill="#8c8c8c" textAnchor="middle">PC2 +</text>
        <text x={cx} y={cy + rad + 18} fontSize={10} fill="#8c8c8c" textAnchor="middle">− PC2</text>
        {data.map((d, i) => {
          const x2 = cx + d.r1 * rad;
          const y2 = cy - d.r2 * rad;
          const isHov = hov === i;
          const col = isHov ? BLUE : ORANGE;
          return (
            <g key={i} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
              <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={col} strokeWidth={isHov ? 2.5 : 1.5} />
              <circle cx={x2} cy={y2} r={isHov ? 5 : 3.5} fill={col} />
              <text x={x2 + (d.r1 >= 0 ? 7 : -7)} y={y2 + (d.r2 <= 0 ? 13 : -6)}
                fontSize={isHov ? 11 : 9} fontWeight={isHov ? 700 : 400}
                fill={isHov ? '#1e2a3a' : '#595959'}
                textAnchor={d.r1 >= 0 ? 'start' : 'end'}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hov !== null && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8,
          padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13, minWidth: 160
        }}>
          <p style={{ fontWeight: 700, color: '#1e2a3a', marginBottom: 6 }}>{data[hov].label}</p>
          <p style={{ color: BLUE, marginBottom: 2 }}>corr. PC1: <strong>{data[hov].r1 > 0 ? '+' : ''}{data[hov].r1}</strong></p>
          <p style={{ color: GREEN }}>corr. PC2: <strong>{data[hov].r2 > 0 ? '+' : ''}{data[hov].r2}</strong></p>
        </div>
      )}
    </div>
  );
};

// ── Page: Stock Clusters (PCA) ────────────────────────────
const CAT_NAMES = Object.keys(CATEGORIES);

const PagePCA = () => {
  const [pcaResult, setPcaResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCats, setSelectedCats] = useState(new Set(CAT_NAMES));

  const toggleCat = (cat) =>
    setSelectedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  const toggleAll = () =>
    setSelectedCats(prev => prev.size === CAT_NAMES.length ? new Set() : new Set(CAT_NAMES));

  useEffect(() => {
    fetchPCA()
      .then(result => {
        // Add colour per point from the frontend CATEGORIES mapping
        const points = (result.points || []).map(p => ({
          ...p,
          color: tickerColor(p.ticker),
        }));
        setPcaResult({ ...result, points });
      })
      .catch(() => setError('Failed to load PCA data'))
      .finally(() => setLoading(false));
  }, []);

  const PCATooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    const info = STOCK_INFO.find(s => s.ticker === d.ticker);
    return (
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13, maxWidth: 280 }}>
        <p style={{ fontWeight: 700, color: '#1e2a3a', marginBottom: 2 }}>{d.ticker}</p>
        {info && <p style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 8 }}>{info.company} · {info.sector}</p>}
        <p style={{ color: '#595959', marginBottom: 2 }}>PC1: <strong>{d.x > 0 ? '+' : ''}{d.x}</strong></p>
        <p style={{ color: '#595959' }}>PC2: <strong>{d.y > 0 ? '+' : ''}{d.y}</strong></p>
        {info && <p style={{ color: '#595959', fontSize: 12, lineHeight: 1.5, borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 8 }}>{info.description}</p>}
      </div>
    );
  };

  return (
    <>
      <div style={{ background: '#fff', padding: '16px 32px', borderBottom: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e2a3a' }}>Stock Clusters</h1>
        <p style={{ fontSize: 13, color: '#8c8c8c', marginTop: 2 }}>
          PCA · 12-month return profiles{pcaResult ? ` · ${pcaResult.range}` : ''}
        </p>
      </div>

      <div style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${BLUE_LIGHT}`, borderTopColor: BLUE, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : error ? (
          <p style={{ color: RED, textAlign: 'center', padding: 40 }}>{error}</p>
        ) : pcaResult ? (
          <>
            {/* Category filter pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
              <button
                onClick={toggleAll}
                style={{
                  padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1.5px solid ${BLUE}`, background: selectedCats.size === CAT_NAMES.length ? BLUE : 'transparent',
                  color: selectedCats.size === CAT_NAMES.length ? '#fff' : BLUE, transition: 'all 0.15s',
                }}
              >
                {selectedCats.size === CAT_NAMES.length ? 'Deselect All' : 'Select All'}
              </button>
              {CAT_NAMES.map(cat => {
                const active = selectedCats.has(cat);
                const col = CATEGORIES[cat].color;
                return (
                  <button key={cat} onClick={() => toggleCat(cat)} style={{
                    padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${col}`, background: active ? col : 'transparent',
                    color: active ? '#fff' : col, transition: 'all 0.15s',
                  }}>
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Biplot */}
            <div style={{ marginBottom: 24 }}>
              <SectionCard
                title={`PC1 (${pcaResult.pc1pct}%) × PC2 (${pcaResult.pc2pct}%) — Stock Position Map`}
                icon={<IconCluster />}
                hint={"Each dot = one stock projected onto the two main axes of variation.\nStocks close together = similar return profile over 12 months → limited diversification.\nStocks far apart = uncorrelated or opposing patterns → better diversification.\nPC1 usually captures the broad market factor (all stocks moving together).\nPC2 often separates defensive sectors (healthcare, retail) from cyclical ones (mining, banking)."}
              >
                <p style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 16 }}>
                  PC1 + PC2 explain <strong style={{ color: BLUE }}>{pcaResult.cumul2}%</strong> of total return variance · Dot colour = sector · Hover for details
                </p>
                <ResponsiveContainer width="100%" height={460}>
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" dataKey="x" name="PC1"
                      tick={{ fontSize: 11, fill: '#8c8c8c' }} axisLine={false} tickLine={false}
                    >
                      <Label value={`← PC1 (${pcaResult.pc1pct}% variance) →`} offset={-10} position="insideBottom" style={{ fontSize: 11, fill: '#8c8c8c' }} />
                    </XAxis>
                    <YAxis type="number" dataKey="y" name="PC2"
                      tick={{ fontSize: 11, fill: '#8c8c8c' }} axisLine={false} tickLine={false}
                    >
                      <Label value={`PC2 (${pcaResult.pc2pct}%)`} angle={-90} position="insideLeft" style={{ fontSize: 11, fill: '#8c8c8c' }} />
                    </YAxis>
                    <ZAxis range={[60, 60]} />
                    <ReferenceLine x={0} stroke="#e8e8e8" strokeDasharray="4 4" />
                    <ReferenceLine y={0} stroke="#e8e8e8" strokeDasharray="4 4" />
                    <Tooltip content={<PCATooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter
                      data={pcaResult.points}
                      shape={(props) => {
                        const { cx, cy, payload } = props;
                        const active = CAT_NAMES.some(cat => selectedCats.has(cat) && CATEGORIES[cat].tickers.includes(payload.ticker));
                        return (
                          <g style={{ transition: 'opacity 0.2s' }}>
                            <circle cx={cx} cy={cy} r={8} fill={active ? payload.color : '#d0d0d0'} fillOpacity={active ? 0.9 : 0.35} stroke="#fff" strokeWidth={1.5} />
                            <text x={cx} y={cy - 13} textAnchor="middle" fontSize={10} fill={active ? payload.color : '#c0c0c0'} fontWeight={active ? 600 : 400}>
                              {payload.ticker.replace('.AX', '')}
                            </text>
                          </g>
                        );
                      }}
                      isAnimationActive={false}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
                <p style={{ fontSize: 12, color: '#8c8c8c', lineHeight: 1.7, marginTop: 16, borderTop: '1px solid #f5f5f5', paddingTop: 14 }}>
                  This biplot projects each stock onto the plane of maximum variance (PC1 × PC2) based on its 12-month return profile.
                  Stocks that cluster together shared similar return dynamics over the period — adding them to the same portfolio provides limited diversification benefit.
                  Stocks in opposing quadrants (far left vs far right, or top vs bottom) tend to be weakly correlated or inversely related, making them better candidates for diversification.
                  The dot colour indicates the GICS sector; use the category filters above to isolate groups and spot intra-sector clustering.
                </p>
              </SectionCard>
            </div>

            {/* Correlation circle */}
            <div style={{ marginBottom: 24 }}>
              <SectionCard
                title="Correlation Circle — Monthly Return vs PC Axes"
                icon={<IconCorrelation />}
                hint={"Each arrow = one of the 12 months projected onto the PC axes.\nArrow length = quality of representation (longer = better explained).\nArrows pointing in the same direction = months that moved stocks similarly.\nOpposite directions = months with opposing return patterns.\nClose to the unit circle = month well captured by PC1 + PC2.\nHover an arrow to see the exact correlation values."}
              >
                <p style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 16 }}>
                  Arrow length = correlation with the axis (max = 1 = perfectly explained) · Hover for exact values
                </p>
                <CorrelCircle data={pcaResult.correlCircle} />
                <p style={{ fontSize: 12, color: '#8c8c8c', lineHeight: 1.7, marginTop: 16, borderTop: '1px solid #f5f5f5', paddingTop: 14 }}>
                  Each arrow represents one of the 12 months, projected onto the PC1 × PC2 plane.
                  The arrow's length indicates how well that month is explained by the two principal components — an arrow reaching the outer circle means PC1 and PC2 together fully capture that month's variation.
                  Arrows pointing in the same direction correspond to months where stocks moved in a similar way.
                  Arrows pointing in opposite directions indicate months with contrasting return patterns across the portfolio.
                  Months clustered near the centre are poorly represented by PC1/PC2 and may require additional components to be understood.
                </p>
              </SectionCard>
            </div>

            {/* Scree plot */}
            <SectionCard
              title="Variance Explained per Component"
              icon={<IconBarChart />}
              hint={"Each bar = % of total monthly return variance captured by that principal component.\nPC1 alone typically explains 30–50% for correlated assets like ASX stocks.\nA steep drop after PC1/PC2 means the data has strong common structure.\nCumulative % is shown in the tooltip and above the chart."}
            >
              <p style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 16 }}>
                Cumulative PC1→PC5: <strong style={{ color: BLUE }}>{pcaResult.screeData[Math.min(4, pcaResult.screeData.length - 1)]?.cumul ?? '—'}%</strong>
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pcaResult.screeData} margin={{ bottom: 10, left: 10 }} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8c8c8c' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8c8c8c' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`} domain={[0, 'auto']} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13 }}>
                        <p style={{ fontWeight: 700, color: '#1e2a3a', marginBottom: 4 }}>{d.name}</p>
                        <p style={{ color: BLUE }}>Variance: <strong>{d.pct}%</strong></p>
                        <p style={{ color: '#8c8c8c', fontSize: 12 }}>Cumulative: {d.cumul}%</p>
                      </div>
                    );
                  }} />
                  <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                    {pcaResult.screeData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? BLUE : i === 1 ? GREEN : '#b0c4de'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </>
        ) : null}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

// ── Main App ───────────────────────────────────────────────
const MobileHeader = ({ onOpen }) => (
  <div className="mobile-header">
    <button className="hamburger-btn" onClick={onOpen} aria-label="Open menu">
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
        <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
        <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
      </svg>
    </button>
    <span className="mobile-title">StockWatch AU</span>
    <span className="mobile-subtitle">ASX Analytics</span>
  </div>
);

export const Dashboard = () => {
  const [activePage, setActivePage] = useState('explorer');
  const [menuOpen, setMenuOpen] = useState(false);
  const [ticker, setTicker] = useState('CBA.AX');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const summaryData = await fetchMarketSummary();
      setSummary(summaryData);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} menuOpen={false} setMenuOpen={() => {}} />
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <MobileHeader onOpen={() => {}} />
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
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} menuOpen={false} setMenuOpen={() => {}} />
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <MobileHeader onOpen={() => {}} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <p style={{ color: RED, marginBottom: 16, fontWeight: 500 }}>Error: {error}</p>
            <button onClick={loadData} style={{
              background: BLUE, color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 24px', cursor: 'pointer',
              fontWeight: 600, fontSize: 14
            }}>Retry</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}
      <Sidebar activePage={activePage} setActivePage={setActivePage} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <div className="main-content" style={{ flex: 1, overflow: 'auto' }}>
        <MobileHeader onOpen={() => setMenuOpen(true)} />
        <div style={{ display: activePage === 'overview' ? 'block' : 'none' }}><PageOverview summary={summary} /></div>
        <div style={{ display: activePage === 'heatmap' ? 'block' : 'none' }}><PageHeatmap /></div>
        <div style={{ display: activePage === 'explorer' ? 'block' : 'none' }}><PageExplorer ticker={ticker} setTicker={setTicker} /></div>
        <div style={{ display: activePage === 'info' ? 'block' : 'none' }}><PageStockInfo /></div>
        <div style={{ display: activePage === 'correlation' ? 'block' : 'none' }}><PageCorrelation /></div>
        <div style={{ display: activePage === 'clusters' ? 'block' : 'none' }}><PagePCA /></div>
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
