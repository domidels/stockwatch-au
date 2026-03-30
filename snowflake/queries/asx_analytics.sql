-- ASX Stock Market Analytics Queries
-- Demonstrating advanced Snowflake capabilities for portfolio showcase

-- =====================================================
-- 1. MARKET PERFORMANCE ANALYSIS
-- =====================================================

-- Query: Top performing stocks by return
SELECT
    ticker,
    company_name,
    ROUND(AVG(close_price), 2) as avg_price,
    ROUND(MAX(close_price), 2) as peak_price,
    ROUND(MIN(close_price), 2) as low_price,
    ROUND(
        (MAX(close_price) - MIN(close_price)) / NULLIF(MIN(close_price), 0) * 100, 2
    ) as total_return_pct,
    ROUND(STDDEV(close_price), 2) as volatility,
    COUNT(*) as trading_days
FROM asx_stock_data
GROUP BY ticker, company_name
HAVING COUNT(*) >= 30
ORDER BY total_return_pct DESC
LIMIT 10;

-- =====================================================
-- 2. VOLATILITY ANALYSIS
-- =====================================================

-- Query: Most volatile stocks (risk analysis)
WITH daily_returns AS (
    SELECT
        date,
        ticker,
        close_price,
        LAG(close_price) OVER (PARTITION BY ticker ORDER BY date) as prev_close,
        CASE
            WHEN LAG(close_price) OVER (PARTITION BY ticker ORDER BY date) IS NOT NULL
            THEN (close_price - LAG(close_price) OVER (PARTITION BY ticker ORDER BY date))
                 / LAG(close_price) OVER (PARTITION BY ticker ORDER BY date) * 100
            ELSE NULL
        END as daily_return_pct
    FROM asx_stock_data
)
SELECT
    ticker,
    ROUND(STDDEV(daily_return_pct), 3) as volatility_std,
    ROUND(AVG(ABS(daily_return_pct)), 3) as avg_daily_change,
    ROUND(MIN(daily_return_pct), 2) as worst_day,
    ROUND(MAX(daily_return_pct), 2) as best_day,
    COUNT(*) as trading_days
FROM daily_returns
WHERE daily_return_pct IS NOT NULL
GROUP BY ticker
HAVING COUNT(*) >= 30
ORDER BY volatility_std DESC
LIMIT 10;

-- =====================================================
-- 3. SECTOR ANALYSIS (simulated)
-- =====================================================

-- Query: Performance by "sector" (based on ticker patterns)
SELECT
    CASE
        WHEN ticker LIKE 'CBA%' OR ticker LIKE 'MQG%' OR ticker LIKE 'ANZ%' THEN 'Banking'
        WHEN ticker LIKE 'BHP%' OR ticker LIKE 'RIO%' OR ticker LIKE 'FMG%' THEN 'Mining'
        WHEN ticker LIKE 'CSL%' OR ticker LIKE 'SHL%' THEN 'Healthcare'
        WHEN ticker LIKE 'TLS%' OR ticker LIKE 'WBC%' THEN 'Telecoms'
        ELSE 'Other'
    END as sector,
    COUNT(DISTINCT ticker) as companies,
    ROUND(AVG(close_price), 2) as avg_price,
    ROUND(SUM(volume), 0) as total_volume,
    ROUND(STDDEV(close_price), 2) as sector_volatility
FROM asx_stock_data
GROUP BY sector
ORDER BY avg_price DESC;

-- =====================================================
-- 4. TREND ANALYSIS
-- =====================================================

-- Query: Price trends over time (moving averages)
WITH price_trends AS (
    SELECT
        date,
        ticker,
        close_price,
        AVG(close_price) OVER (
            PARTITION BY ticker
            ORDER BY date
            ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
        ) as ma_5day,
        AVG(close_price) OVER (
            PARTITION BY ticker
            ORDER BY date
            ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
        ) as ma_20day
    FROM asx_stock_data
)
SELECT
    ticker,
    date,
    close_price,
    ROUND(ma_5day, 2) as ma_5day,
    ROUND(ma_20day, 2) as ma_20day,
    CASE
        WHEN ma_5day > ma_20day THEN 'Bullish'
        WHEN ma_5day < ma_20day THEN 'Bearish'
        ELSE 'Neutral'
    END as trend_signal
FROM price_trends
WHERE ma_20day IS NOT NULL
ORDER BY ticker, date DESC
LIMIT 50;

-- =====================================================
-- 5. VOLUME ANALYSIS
-- =====================================================

-- Query: Trading volume patterns
SELECT
    DATE_TRUNC('week', date) as week,
    ticker,
    SUM(volume) as weekly_volume,
    AVG(volume) as avg_daily_volume,
    COUNT(*) as trading_days,
    ROUND(STDDEV(volume), 0) as volume_volatility
FROM asx_stock_data
GROUP BY week, ticker
HAVING COUNT(*) >= 3
ORDER BY weekly_volume DESC
LIMIT 20;

-- =====================================================
-- 6. CORRELATION ANALYSIS
-- =====================================================

-- Query: Stock price correlations (simplified)
WITH stock_returns AS (
    SELECT
        date,
        ticker,
        CASE
            WHEN LAG(close_price) OVER (PARTITION BY ticker ORDER BY date) IS NOT NULL
            THEN (close_price - LAG(close_price) OVER (PARTITION BY ticker ORDER BY date))
                 / LAG(close_price) OVER (PARTITION BY ticker ORDER BY date)
            ELSE NULL
        END as return_pct
    FROM asx_stock_data
    WHERE ticker IN ('CBA.AX', 'BHP.AX', 'MQG.AX', 'RIO.AX')  -- Top stocks
)
SELECT
    s1.ticker as stock1,
    s2.ticker as stock2,
    COUNT(*) as data_points,
    ROUND(CORR(s1.return_pct, s2.return_pct), 3) as correlation
FROM stock_returns s1
JOIN stock_returns s2 ON s1.date = s2.date AND s1.ticker < s2.ticker
WHERE s1.return_pct IS NOT NULL AND s2.return_pct IS NOT NULL
GROUP BY s1.ticker, s2.ticker
HAVING COUNT(*) >= 30
ORDER BY correlation DESC;

-- =====================================================
-- 7. PORTFOLIO SIMULATION
-- =====================================================

-- Query: Simple portfolio performance simulation
WITH portfolio_weights AS (
    SELECT 'CBA.AX' as ticker, 0.3 as weight UNION ALL
    SELECT 'BHP.AX', 0.25 UNION ALL
    SELECT 'MQG.AX', 0.2 UNION ALL
    SELECT 'RIO.AX', 0.15 UNION ALL
    SELECT 'CSL.AX', 0.1
),
daily_portfolio AS (
    SELECT
        d.date,
        SUM(
            CASE
                WHEN LAG(s.close_price) OVER (PARTITION BY s.ticker ORDER BY s.date) IS NOT NULL
                THEN (s.close_price - LAG(s.close_price) OVER (PARTITION BY s.ticker ORDER BY s.date))
                     / LAG(s.close_price) OVER (PARTITION BY s.ticker ORDER BY s.date) * w.weight
                ELSE 0
            END
        ) as portfolio_return_pct
    FROM asx_stock_data s
    JOIN portfolio_weights w ON s.ticker = w.ticker
    GROUP BY d.date
)
SELECT
    date,
    ROUND(portfolio_return_pct * 100, 3) as daily_return_pct,
    ROUND(SUM(portfolio_return_pct) OVER (ORDER BY date), 3) as cumulative_return
FROM daily_portfolio
ORDER BY date DESC
LIMIT 30;

-- =====================================================
-- 8. COST OPTIMIZATION DEMO
-- =====================================================

-- Query: Efficient data sampling for dashboard
SELECT
    DATE_TRUNC('day', date) as date,
    ticker,
    ROUND(AVG(close_price), 2) as avg_price,
    ROUND(SUM(volume)/1000000, 1) as volume_millions,
    COUNT(*) as records
FROM asx_stock_data
WHERE date >= DATEADD('month', -3, CURRENT_DATE)  -- Last 3 months only
GROUP BY date, ticker
ORDER BY date DESC, avg_price DESC
LIMIT 100;