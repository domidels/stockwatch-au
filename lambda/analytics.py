"""
Analytics shared by the API handler and the ingestion pipeline.
Pure functions over the consolidated DataFrame — no S3 access here.

The ingestion Lambda calls build_static_payloads() after each run and writes
the result to s3://<bucket>/api/*.json, served as static files by CloudFront.
"""

from datetime import date, datetime, timedelta

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA

# Periods offered by the dashboard (None = all available data)
OVERVIEW_PERIODS = [30, 90, 180, 365, 730, None]


def apply_days_filter(df: pd.DataFrame, days: int) -> pd.DataFrame:
    if not days:
        return df
    cutoff = (datetime.utcnow() - timedelta(days=days)).strftime('%Y-%m-%d')
    return df[df['date'] >= cutoff]


def get_top_performers(df: pd.DataFrame, days: int = None) -> dict:
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


def get_volatility_analysis(df: pd.DataFrame, days: int = None) -> dict:
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


def get_stock_history(df: pd.DataFrame, ticker: str, days: int = None) -> dict:
    df = df[df['ticker'] == ticker]
    df = apply_days_filter(df, days)
    df = df.sort_values('date')

    results = df[['date', 'open', 'high', 'low', 'close', 'volume']].to_dict('records')
    return {'type': 'history', 'ticker': ticker, 'data': results}


def get_monthly_returns(df: pd.DataFrame) -> dict:
    df = df.assign(_month=pd.to_datetime(df['date']).dt.to_period('M'))

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


def get_pca_analysis(df: pd.DataFrame, monthly: list = None) -> dict:
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
    if monthly is None:
        monthly = get_monthly_returns(df)['data']

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


def get_market_summary(df: pd.DataFrame) -> dict:
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


def build_static_payloads(df: pd.DataFrame) -> dict:
    """
    Pre-compute every payload the dashboard needs, keyed by relative S3 path.

    - summary.json          market summary
    - overview.json         top performers + volatility for every period, in one file
                            (keys are the period in days, "all" for no filter)
    - heatmap.json          monthly returns
    - pca.json              PCA analysis
    - history/<TICKER>.json full price history (the frontend filters by period)
    """
    df = df.copy()
    df['date'] = df['date'].astype(str)

    monthly = get_monthly_returns(df)

    overview = {}
    for days in OVERVIEW_PERIODS:
        overview[str(days) if days else 'all'] = {
            'top_performers': get_top_performers(df, days)['data'],
            'volatility': get_volatility_analysis(df, days)['data'],
        }

    payloads = {
        'summary.json': get_market_summary(df),
        'overview.json': {
            'type': 'overview',
            'generated_at': datetime.utcnow().isoformat(timespec='seconds') + 'Z',
            'periods': overview,
        },
        'heatmap.json': monthly,
        'pca.json': get_pca_analysis(df, monthly['data']),
    }

    for ticker in sorted(df['ticker'].unique()):
        history = get_stock_history(df, ticker)
        for row in history['data']:
            for col in ('open', 'high', 'low', 'close'):
                row[col] = round(float(row[col]), 4)
            row['volume'] = int(row['volume'])
        payloads[f'history/{ticker}.json'] = history

    return payloads
