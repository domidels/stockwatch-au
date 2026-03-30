-- ASX Analytics Database Schema
-- Optimized for cost-effective analytics on Australian stock market data

-- =====================================================
-- DATABASE AND WAREHOUSE SETUP
-- =====================================================

-- Create database (run once)
CREATE DATABASE IF NOT EXISTS ASX_ANALYTICS
COMMENT = 'Australian Stock Exchange analytics database - cost optimized';

-- Create schema
CREATE SCHEMA IF NOT EXISTS ASX_ANALYTICS.PUBLIC;

-- Create warehouse (cost-optimized size)
CREATE WAREHOUSE IF NOT EXISTS ASX_WH
WAREHOUSE_SIZE = XSMALL
AUTO_SUSPEND = 60
AUTO_RESUME = TRUE
INITIALLY_SUSPENDED = TRUE
COMMENT = 'Cost-optimized warehouse for ASX analytics';

-- =====================================================
-- MAIN DATA TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ASX_ANALYTICS.PUBLIC.asx_stock_data (
    -- Date dimensions
    date DATE NOT NULL,
    extraction_date DATE,

    -- Stock identifiers
    ticker VARCHAR(10) NOT NULL,
    company_name VARCHAR(255),

    -- Price data (optimized for analytics)
    open_price FLOAT,
    high_price FLOAT,
    low_price FLOAT,
    close_price FLOAT,

    -- Volume and corporate actions
    volume BIGINT,
    dividends FLOAT DEFAULT 0,
    stock_splits FLOAT DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
COMMENT = 'ASX stock market data - optimized for time-series analytics'
CLUSTER BY (ticker, date);  -- Clustering for efficient queries

-- =====================================================
-- OPTIMIZATION: Create search optimization
-- =====================================================

-- Enable search optimization for fast filtering
ALTER TABLE ASX_ANALYTICS.PUBLIC.asx_stock_data
SET SEARCH_OPTIMIZATION = TRUE;

-- =====================================================
-- VIEWS FOR COMMON ANALYTICS
-- =====================================================

-- Daily returns view
CREATE VIEW IF NOT EXISTS ASX_ANALYTICS.PUBLIC.v_daily_returns AS
SELECT
    date,
    ticker,
    company_name,
    close_price,
    LAG(close_price) OVER (PARTITION BY ticker ORDER BY date) as prev_close,
    CASE
        WHEN LAG(close_price) OVER (PARTITION BY ticker ORDER BY date) IS NOT NULL
        THEN (close_price - LAG(close_price) OVER (PARTITION BY ticker ORDER BY date))
             / LAG(close_price) OVER (PARTITION BY ticker ORDER BY date) * 100
        ELSE NULL
    END as daily_return_pct
FROM ASX_ANALYTICS.PUBLIC.asx_stock_data
ORDER BY ticker, date;

-- Monthly aggregated view
CREATE VIEW IF NOT EXISTS ASX_ANALYTICS.PUBLIC.v_monthly_summary AS
SELECT
    DATE_TRUNC('month', date) as month,
    ticker,
    company_name,
    AVG(close_price) as avg_close,
    MIN(low_price) as min_price,
    MAX(high_price) as max_price,
    SUM(volume) as total_volume,
    STDDEV(close_price) as volatility,
    COUNT(*) as trading_days
FROM ASX_ANALYTICS.PUBLIC.asx_stock_data
GROUP BY DATE_TRUNC('month', date), ticker, company_name
ORDER BY month DESC, ticker;

-- Top performers view
CREATE VIEW IF NOT EXISTS ASX_ANALYTICS.PUBLIC.v_top_performers AS
SELECT
    ticker,
    company_name,
    COUNT(*) as data_points,
    ROUND(AVG(close_price), 2) as avg_price,
    ROUND(MAX(close_price), 2) as max_price,
    ROUND(MIN(close_price), 2) as min_price,
    ROUND(STDDEV(close_price), 2) as volatility,
    ROUND(
        (MAX(close_price) - MIN(close_price)) / NULLIF(MIN(close_price), 0) * 100, 2
    ) as price_range_pct
FROM ASX_ANALYTICS.PUBLIC.asx_stock_data
GROUP BY ticker, company_name
HAVING COUNT(*) >= 30  -- At least a month of data
ORDER BY avg_price DESC;

-- =====================================================
-- COST OPTIMIZATION SETTINGS
-- =====================================================

-- Set session parameters for cost control
ALTER SESSION SET QUERY_TAG = 'ASX_ANALYTICS_COST_OPTIMIZED';
ALTER SESSION SET STATEMENT_TIMEOUT_IN_SECONDS = 300;  -- 5 minute timeout

-- =====================================================
-- USAGE TRACKING (for cost monitoring)
-- =====================================================

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS ASX_ANALYTICS.PUBLIC.query_usage_log (
    query_id VARCHAR(50),
    user_name VARCHAR(100),
    warehouse_name VARCHAR(100),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    credits_used FLOAT,
    query_text VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
COMMENT = 'Track query usage for cost optimization analysis';

-- =====================================================
-- SAMPLE DATA VALIDATION
-- =====================================================

-- Quick data quality check
SELECT
    'Data Quality Check' as check_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT ticker) as unique_tickers,
    MIN(date) as earliest_date,
    MAX(date) as latest_date,
    AVG(close_price) as avg_price_all_stocks
FROM ASX_ANALYTICS.PUBLIC.asx_stock_data;

-- Check for data completeness
SELECT
    ticker,
    COUNT(*) as records,
    MIN(date) as start_date,
    MAX(date) as end_date,
    DATEDIFF('day', MIN(date), MAX(date)) + 1 as expected_days,
    COUNT(*) - (DATEDIFF('day', MIN(date), MAX(date)) + 1) as missing_days
FROM ASX_ANALYTICS.PUBLIC.asx_stock_data
GROUP BY ticker
ORDER BY records DESC
LIMIT 10;