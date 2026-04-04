import React, { useState, useEffect } from 'react';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
  ScatterChart, Scatter, ZAxis, ReferenceLine, ReferenceArea, Label
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
  Banking:    { tickers: ['CBA.AX','WBC.AX','NAB.AX','ANZ.AX','MQG.AX'], color: '#0072B2' },
  Mining:     { tickers: ['BHP.AX','RIO.AX','FMG.AX'],                   color: '#E69F00' },
  Healthcare: { tickers: ['CSL.AX','COH.AX','SHL.AX'],                   color: '#009E73' },
  Retail:     { tickers: ['WES.AX','COL.AX','WOW.AX'],                   color: '#CC79A7' },
  Technology: { tickers: ['XRO.AX','REA.AX'],                            color: '#56B4E9' },
  Energy:     { tickers: ['STO.AX'],                                      color: '#D55E00' },
  Other:      { tickers: ['TLS.AX','GMG.AX','ALL.AX'],                   color: '#555555' },
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
  { ticker: 'TLS.AX', company: 'Telstra', sector: 'Telecommunications', description: 'Australia\'s leading telecom operator. Provides mobile, fixed-line and internet services for individuals and businesses. Rolling out 5G network.' },
  { ticker: 'COL.AX', company: 'Coles Group', sector: 'Retail / Supermarkets', description: 'Australia\'s second largest supermarket chain after Woolworths. Also operates liquor stores and fuel outlets. Demerged from Wesfarmers in 2018.' },
  { ticker: 'ALL.AX', company: 'Aristocrat Leisure', sector: 'Gaming / Entertainment', description: 'Global manufacturer of slot machines and mobile game developer. Present in casinos across 90 countries. Strong growth in digital gaming.' },
  { ticker: 'REA.AX', company: 'REA Group', sector: 'Tech / Real Estate', description: 'Operator of realestate.com.au, Australia\'s leading property portal. 62% owned by News Corp. Also present in India and the United States.' },
  { ticker: 'STO.AX', company: 'Santos', sector: 'Energy / Oil & Gas', description: 'Australian producer of oil and liquefied natural gas (LNG). Operates primarily in Australia, PNG and Timor-Leste. Key supplier to Asia.' },
  { ticker: 'XRO.AX', company: 'Xero', sector: 'Technology / SaaS', description: 'New Zealand-based cloud accounting software provider for SMEs. Market leader in Australia and New Zealand. Expanding in the UK and US.' },
  { ticker: 'WOW.AX', company: 'Woolworths Group', sector: 'Retail / Supermarkets', description: 'Australia\'s largest retail group. Operates supermarkets, liquor stores (BWS, Dan Murphy\'s) and Big W. One of the country\'s largest employers.' },
  { ticker: 'FMG.AX', company: 'Fortescue', sector: 'Mining / Iron Ore', description: 'World\'s third largest iron ore producer. Founded by Andrew Forrest. Investing heavily in green hydrogen through Fortescue Future Industries.' },
  { ticker: 'SHL.AX', company: 'Sonic Healthcare', sector: 'Healthcare / Diagnostics', description: 'Global network of medical laboratories and radiology services. Present in Australia, Germany, USA, Switzerland and UK. Strong growth during COVID.' },
  { ticker: 'COH.AX', company: 'Cochlear', sector: 'Healthcare / Medical Devices', description: 'World leader in cochlear implants (hearing prosthetics). Present in 180 countries. An iconic Australian product born from University of Sydney research.' },
];

const PERIOD_LABELS = {
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
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1e2a3a' }}>{title}</h2>
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
        </div>
      </div>
    </div>

    <nav style={{ padding: '16px 12px', flex: 1 }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px', marginBottom: 4 }}>Dashboard</p>
      {[
        { id: 'overview', label: 'Market Overview', icon: <IconBarChart /> },
        { id: 'explorer', label: 'Stock Explorer', icon: <IconSearch /> },
        { id: 'info', label: 'Stock Info', icon: <IconInfo /> },
      ].map(({ id, label, icon }) => {
        const active = activePage === id;
        return (
          <div key={id} onClick={() => setActivePage(id)} style={{
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
const PERIODS = [
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
  { label: 'All', days: null },
];

const PeriodFilter = ({ selected, onChange }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {PERIODS.map(p => (
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
      <p style={{ color: GREEN, marginBottom: 2 }}>Return: <strong>{d.y > 0 ? '+' : ''}{d.y}%</strong></p>
      <p style={{ color: ORANGE, marginBottom: info ? 8 : 0 }}>Volatility: <strong>{d.x}%</strong></p>
      {info && <p style={{ color: '#595959', fontSize: 12, lineHeight: 1.5, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>{info.description}</p>}
    </div>
  );
};

const RiskReturnScatter = ({ data, volatility, allData, allVolatility, axisLimits }) => {
  const volMap = {};
  volatility.forEach(v => { volMap[v.ticker] = v.volatility_std; });

  const points = data
    .filter(d => volMap[d.ticker] != null)
    .map((d) => ({
      ticker: d.ticker,
      x: parseFloat(volMap[d.ticker]),
      y: parseFloat(d.total_return_pct),
      color: tickerColor(d.ticker),
    }));

  // Quadrant lines always computed on ALL stocks regardless of category filter
  const allVolMap = {};
  (allVolatility || volatility).forEach(v => { allVolMap[v.ticker] = v.volatility_std; });
  const allPoints = (allData || data)
    .filter(d => allVolMap[d.ticker] != null)
    .map(d => ({ x: parseFloat(allVolMap[d.ticker]), y: parseFloat(d.total_return_pct) }));
  const avgVol = allPoints.length ? allPoints.reduce((s, p) => s + p.x, 0) / allPoints.length : 0;
  const avgRet = allPoints.length ? allPoints.reduce((s, p) => s + p.y, 0) / allPoints.length : 0;

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
          <Label value="Return (%)" angle={-90} position="insideLeft" style={{ fontSize: 11, fill: '#8c8c8c' }} />
        </YAxis>
        <ZAxis range={[60, 60]} />
        <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        {/* Quadrant background shading */}
        <ReferenceArea x1={xDomain[0]} x2={avgVol} y1={avgRet} y2={yDomain[1]} fill="#009E73" fillOpacity={0.06} />
        <ReferenceArea x1={avgVol} x2={xDomain[1]} y1={yDomain[0]} y2={avgRet} fill="#D55E00" fillOpacity={0.06} />

        {/* Quadrant lines — based on all stocks, fixed regardless of category filter */}
        <ReferenceLine x={avgVol} stroke="#b0b0b0" strokeWidth={2} strokeDasharray="6 3" />
        <ReferenceLine y={avgRet} stroke="#b0b0b0" strokeWidth={2} strokeDasharray="6 3"
          label={(props) => {
            const { viewBox } = props;
            return (
              <g>
                <text x={viewBox.x + 8} y={viewBox.y - 8} fontSize={13} fill="#52c41a" fontWeight={700}>Best ↖</text>
                <text x={viewBox.x + viewBox.width - 8} y={viewBox.y + 20} fontSize={13} fill="#ff4d4f" fontWeight={700} textAnchor="end">↘ Avoid</text>
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
        PERIODS.map(p =>
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

  // Compute fixed axis limits across ALL periods so scales don't jump
  const axisLimits = React.useMemo(() => {
    const allVol = [], allRet = [];
    Object.values(cache).forEach(({ topPerformers: tp, volatility: vol }) => {
      const volMap = {};
      vol.forEach(v => { volMap[v.ticker] = parseFloat(v.volatility_std); });
      tp.forEach(d => {
        if (volMap[d.ticker] != null) {
          allVol.push(volMap[d.ticker]);
          allRet.push(parseFloat(d.total_return_pct));
        }
      });
    });
    if (!allVol.length) return null;
    const pad = (range) => range * 0.1;
    const minVol = Math.min(...allVol);
    const maxVol = Math.max(...allVol);
    const minRet = Math.min(...allRet);
    const maxRet = Math.max(...allRet);
    return {
      xMin: Math.floor((minVol - pad(maxVol - minVol)) * 10) / 10,
      xMax: Math.ceil((maxVol + pad(maxVol - minVol)) * 10) / 10,
      yMin: Math.floor((minRet - pad(maxRet - minRet))),
      yMax: Math.ceil((maxRet + pad(maxRet - minRet))),
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
        <PeriodFilter selected={days} onChange={setDays} />
        <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 4 }}>
          {days ? `Last ${PERIODS.find(p => p.days === days)?.label}` : 'All available data'}
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
            <SectionCard title="Risk / Return — Volatility vs Total Return" icon={<IconZap />}>
              {/* Category checkboxes */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1e2a3a' }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: BLUE }} />
                  All
                </label>
                <div style={{ width: 1, height: 20, background: '#e8e8e8', margin: '0 4px' }} />
                {Object.entries(CATEGORIES).map(([cat, { color }]) => (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={selectedCats.has(cat)} onChange={() => toggleCat(cat)}
                      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: color }} />
                    <span style={{ color: selectedCats.has(cat) ? color : '#bfbfbf', fontWeight: selectedCats.has(cat) ? 600 : 400, transition: 'color 0.15s' }}>
                      {cat}
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ marginBottom: 12, display: 'flex', gap: 20, fontSize: 12, color: '#8c8c8c' }}>
                <span style={{ color: GREEN }}>↖ Top-left = best (low risk, high return)</span>
                <span style={{ color: RED }}>↘ Bottom-right = avoid (high risk, low return)</span>
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
                allData={topPerformers}
                allVolatility={volatility}
                axisLimits={axisLimits}
              />
            </SectionCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <SectionCard title="Total Return % — Ranked Best to Worst" icon={<IconBarChart />}>
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

            <SectionCard title="Daily Volatility % — Ranked Most to Least" icon={<IconZap />}>
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
          PERIODS.map(p =>
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
  const priceHistory = cache[cacheKey] || [];

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stock</span>
            <select
              value={ticker}
              onChange={e => setTicker(e.target.value)}
              style={{
                padding: '9px 16px', borderRadius: 8, border: `2px solid ${BLUE}`,
                fontSize: 15, fontWeight: 700, color: '#1e2a3a', cursor: 'pointer',
                outline: 'none', background: '#fff', fontFamily: 'inherit'
              }}
            >
              {ASX_TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ width: 1, height: 32, background: '#e8e8e8' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Period</span>
            <PeriodFilter selected={explorerDays} onChange={setExplorerDays} />
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
          <SectionCard title={`Closing Price — ${ticker} (${periodLabel})`} icon={<IconSearch />}>
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
              {displayed.map((stock, i) => (
                <tr key={stock.ticker} style={{ borderBottom: '1px solid #fafafa', background: i % 2 === 0 ? '#fff' : '#fafafa', verticalAlign: 'top' }}>
                  <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{ background: BLUE_LIGHT, color: BLUE, padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>{stock.ticker}</span>
                  </td>
                  <td style={{ padding: '14px 12px', fontWeight: 600, color: '#1e2a3a', whiteSpace: 'nowrap' }}>{stock.company}</td>
                  <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{ background: PURPLE_LIGHT, color: PURPLE, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>{stock.sector}</span>
                  </td>
                  <td style={{ padding: '14px 12px', color: '#595959', lineHeight: 1.6 }}>{stock.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </>
  );
};

// ── Main App ───────────────────────────────────────────────
export const Dashboard = () => {
  const [activePage, setActivePage] = useState('overview');
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
          <p style={{ color: RED, marginBottom: 16, fontWeight: 500 }}>Error: {error}</p>
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
        <div style={{ display: activePage === 'overview' ? 'block' : 'none' }}><PageOverview summary={summary} /></div>
        <div style={{ display: activePage === 'explorer' ? 'block' : 'none' }}><PageExplorer ticker={ticker} setTicker={setTicker} /></div>
        <div style={{ display: activePage === 'info' ? 'block' : 'none' }}><PageStockInfo /></div>
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
