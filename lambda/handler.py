"""
Lambda Function Handler for StockWatch AU
Reads ASX Parquet data from S3 and computes analytics via pandas
"""

import concurrent.futures
import io
import json
import logging
import os
import time
from datetime import date, datetime, timedelta

import boto3
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')

S3_BUCKET = os.environ.get('S3_BUCKET')
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')
S3_PREFIX = 'raw/asx/'

# Module-level cache — reused across warm Lambda invocations
_cache_df: pd.DataFrame | None = None
_cache_ts: float = 0.0
CACHE_TTL = 300  # 5 minutes


def _fetch_parquet(key: str) -> pd.DataFrame:
    response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
    return pd.read_parquet(io.BytesIO(response['Body'].read()))


def load_data_from_s3() -> pd.DataFrame:
    """Load all ASX Parquet files from S3, with in-memory cache and parallel reads."""
    global _cache_df, _cache_ts

    if _cache_df is not None and (time.time() - _cache_ts) < CACHE_TTL:
        logger.info("Cache hit — skipping S3 reads")
        return _cache_df

    paginator = s3_client.get_paginator('list_objects_v2')
    keys = [
        obj['Key']
        for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=S3_PREFIX)
        for obj in page.get('Contents', [])
    ]

    if not keys:
        return pd.DataFrame(columns=['date', 'ticker', 'company_name', 'open', 'high', 'low', 'close', 'volume'])

    logger.info(f"Loading {len(keys)} Parquet files in parallel")
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        frames = list(executor.map(_fetch_parquet, keys))

    df = pd.concat(frames, ignore_index=True)
    df['date'] = df['date'].astype(str)

    _cache_df = df
    _cache_ts = time.time()
    logger.info(f"Loaded {len(df)} rows, cache refreshed")
    return df


def apply_days_filter(df: pd.DataFrame, days: int) -> pd.DataFrame:
    if not days:
        return df
    cutoff = (datetime.utcnow() - timedelta(days=days)).strftime('%Y-%m-%d')
    return df[df['date'] >= cutoff]


def get_top_performers(days: int = None) -> dict:
    df = load_data_from_s3()
    df = apply_days_filter(df, days)

    results = []
    for ticker, group in df.groupby('ticker'):
        group = group.sort_values('date')
        if len(group) < 20:
            continue
        first_close = float(group.iloc[0]['close'])
        last_close = float(group.iloc[-1]['close'])
        total_return = round((last_close - first_close) / first_close * 100, 2) if first_close else 0.0
        results.append({
            'TICKER': ticker,
            'COMPANY_NAME': group.iloc[0]['company_name'],
            'START_PRICE': round(first_close, 2),
            'END_PRICE': round(last_close, 2),
            'TOTAL_RETURN_PCT': total_return,
            'VOLATILITY': round(float(group['close'].std()), 2),
            'DATA_POINTS': len(group),
        })

    results.sort(key=lambda x: x['TICKER'])
    return {'type': 'top_performers', 'data': results, 'count': len(results)}


def get_volatility_analysis(days: int = None) -> dict:
    df = load_data_from_s3()
    df = apply_days_filter(df, days)

    results = []
    for ticker, group in df.groupby('ticker'):
        group = group.sort_values('date')
        daily_returns = group['close'].pct_change() * 100
        daily_returns = daily_returns.dropna()
        if len(daily_returns) < 20:
            continue
        results.append({
            'TICKER': ticker,
            'VOLATILITY_STD': round(float(daily_returns.std()), 3),
            'AVG_DAILY_CHANGE': round(float(daily_returns.abs().mean()), 3),
            'WORST_DAY': round(float(daily_returns.min()), 2),
            'BEST_DAY': round(float(daily_returns.max()), 2),
        })

    results.sort(key=lambda x: x['TICKER'])
    return {'type': 'volatility_analysis', 'data': results, 'count': len(results)}


def get_stock_history(ticker: str, days: int = None) -> dict:
    df = load_data_from_s3()
    df = df[df['ticker'] == ticker]
    df = apply_days_filter(df, days)
    df = df.sort_values('date')

    results = df[['date', 'open', 'high', 'low', 'close', 'volume']].to_dict('records')
    return {'type': 'history', 'ticker': ticker, 'data': results}


def get_monthly_returns() -> dict:
    df = load_data_from_s3()
    df['_month'] = pd.to_datetime(df['date']).dt.to_period('M')

    results = []
    for (ticker, month), group in df.groupby(['ticker', '_month']):
        group = group.sort_values('date')
        open_price = float(group.iloc[0]['close'])
        close_price = float(group.iloc[-1]['close'])
        monthly_return = round((close_price - open_price) / open_price * 100, 2) if open_price else 0.0
        results.append({
            'TICKER': ticker,
            'MONTH': str(month),
            'MONTHLY_RETURN': monthly_return,
        })

    results.sort(key=lambda x: (x['TICKER'], x['MONTH']))
    return {'type': 'monthly_returns', 'data': results, 'count': len(results)}


def get_pca_analysis() -> dict:
    """
    Run PCA on the last 12 months of monthly returns across all tickers.

    Returns:
      - points: list of {ticker, x, y} scores on PC1/PC2
      - correlCircle: list of {label, r1, r2} — month projections onto PC1/PC2
      - screeData: list of {name, pct, cumul} — explained variance per component
      - explainedVar: raw list of % per component
      - range: human-readable date range string (e.g. "Apr 2025 – Mar 2026")
      - pc1pct, pc2pct, cumul2: convenience floats for the UI
    """
    monthly = get_monthly_returns()['data']

    all_months = sorted({row['MONTH'] for row in monthly})
    last12 = all_months[-12:]

    tickers = sorted({row['TICKER'] for row in monthly})

    lookup = {(r['TICKER'], r['MONTH']): float(r['MONTHLY_RETURN']) for r in monthly}
    matrix = np.array([
        [lookup.get((t, m), 0.0) for m in last12]
        for t in tickers
    ], dtype=float)

    matrix -= matrix.mean(axis=0)

    n_components = min(5, len(tickers), len(last12))
    pca = PCA(n_components=n_components)
    scores = pca.fit_transform(matrix)
    loadings = pca.components_
    explained = [round(float(v * 100), 1) for v in pca.explained_variance_ratio_]
    # singular_values_**2 = S_k² = sum of squares of score vectors
    # This matches the NIPALS eigenvalue definition used in the correlation circle formula.
    # pca.explained_variance_ would be S_k²/(n-1) and would shrink the circle.
    eigenvalues = pca.singular_values_ ** 2

    points = [
        {'ticker': t, 'x': round(float(scores[i, 0]), 3), 'y': round(float(scores[i, 1]), 3)}
        for i, t in enumerate(tickers)
    ]

    col_ss = (matrix ** 2).sum(axis=0)

    def fmt_month(m):
        y, mo = m.split('-')
        return date(int(y), int(mo), 1).strftime('%b %y')

    def fmt_month_long(m):
        y, mo = m.split('-')
        return date(int(y), int(mo), 1).strftime('%b %Y')

    correl_circle = []
    for j, month in enumerate(last12):
        ss = float(col_ss[j]) or 1.0
        r1 = float(loadings[0, j]) * float(eigenvalues[0]) ** 0.5 / ss ** 0.5
        r2 = float(loadings[1, j]) * float(eigenvalues[1]) ** 0.5 / ss ** 0.5
        correl_circle.append({'label': fmt_month(month), 'r1': round(r1, 3), 'r2': round(r2, 3)})

    scree_data = []
    cumul = 0.0
    for i, pct in enumerate(explained):
        cumul += pct
        scree_data.append({'name': f'PC{i + 1}', 'pct': pct, 'cumul': round(cumul, 1)})

    return {
        'type': 'pca',
        'points': points,
        'correlCircle': correl_circle,
        'screeData': scree_data,
        'explainedVar': explained,
        'range': f'{fmt_month_long(last12[0])} – {fmt_month_long(last12[-1])}',
        'pc1pct': explained[0] if explained else 0,
        'pc2pct': explained[1] if len(explained) > 1 else 0,
        'cumul2': round(
            (explained[0] if explained else 0) + (explained[1] if len(explained) > 1 else 0), 1
        ),
    }


def get_market_summary() -> dict:
    df = load_data_from_s3()
    if df.empty:
        return {'type': 'market_summary', 'data': {}}

    return {
        'type': 'market_summary',
        'data': {
            'UNIQUE_STOCKS': int(df['ticker'].nunique()),
            'TOTAL_RECORDS': len(df),
            'EARLIEST_DATE': df['date'].min(),
            'LATEST_DATE': df['date'].max(),
            'AVG_PRICE': round(float(df['close'].mean()), 2),
            'AVG_VOLUME': round(float(df['volume'].mean()), 0),
        }
    }


def lambda_handler(event, context):
    """Main Lambda handler — routes requests based on {method} path parameter"""
    logger.info(f"Received event: {json.dumps(event)}")

    try:
        method = event.get('pathParameters', {}).get('method', 'summary').lower()
        query_params = event.get('queryStringParameters') or {}
        days = int(query_params['days']) if query_params.get('days', '').isdigit() else None

        if method == 'top_performers':
            result = get_top_performers(days=days)
        elif method == 'volatility':
            result = get_volatility_analysis(days=days)
        elif method == 'summary':
            result = get_market_summary()
        elif method == 'heatmap':
            result = get_monthly_returns()
        elif method == 'pca':
            result = get_pca_analysis()
        elif method == 'history':
            ticker = query_params.get('ticker', '').upper()
            if not ticker:
                result = {'error': 'Missing required parameter: ticker'}
            else:
                result = get_stock_history(ticker, days=days)
        else:
            result = {
                'error': f'Unknown method: {method}',
                'available_methods': ['summary', 'top_performers', 'volatility', 'history', 'heatmap', 'pca']
            }

        def json_serial(obj):
            if isinstance(obj, (date, datetime)):
                return obj.isoformat()
            raise TypeError(f"Type {type(obj)} not serializable")

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json'
            },
            'body': json.dumps(result, default=json_serial)
        }

    except Exception as e:
        logger.error(f"Lambda error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': str(e), 'environment': ENVIRONMENT})
        }
