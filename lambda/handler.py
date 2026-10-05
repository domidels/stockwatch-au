"""
Lambda Function Handler for StockWatch AU
Reads ASX Parquet data from S3 and computes analytics via pandas.
The dashboard reads the pre-computed copies in s3://<bucket>/api/ (see analytics.py);
this API stays available for ad-hoc queries (e.g. arbitrary ?days= values).
"""

import io
import json
import logging
import os
import time
from datetime import date, datetime

import analytics
import boto3
import pandas as pd

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')

S3_BUCKET = os.environ.get('S3_BUCKET')
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')
CONSOLIDATED_KEY = 'raw/asx/consolidated/asx_all.parquet'

# Module-level cache — reused across warm Lambda invocations
_cache_df: pd.DataFrame | None = None
_cache_ts: float = 0.0
CACHE_TTL = 300  # 5 minutes


def load_data_from_s3() -> pd.DataFrame:
    """Read the single consolidated Parquet file from S3, with in-memory cache."""
    global _cache_df, _cache_ts

    if _cache_df is not None and (time.time() - _cache_ts) < CACHE_TTL:
        logger.info("Cache hit")
        return _cache_df

    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=CONSOLIDATED_KEY)
        df = pd.read_parquet(io.BytesIO(response['Body'].read()))
        df['date'] = df['date'].astype(str)
        _cache_df = df
        _cache_ts = time.time()
        logger.info(f"Loaded {len(df)} rows from consolidated file")
        return df
    except s3_client.exceptions.NoSuchKey:
        logger.warning("Consolidated file not found — returning empty DataFrame")
        return pd.DataFrame(columns=['date', 'ticker', 'company_name', 'open', 'high', 'low', 'close', 'volume'])


def lambda_handler(event, context):
    """Main Lambda handler — routes requests based on {method} path parameter"""
    logger.info(f"Received event: {json.dumps(event)}")

    try:
        method = event.get('pathParameters', {}).get('method', 'summary').lower()
        query_params = event.get('queryStringParameters') or {}
        days = int(query_params['days']) if query_params.get('days', '').isdigit() else None

        if method == 'top_performers':
            result = analytics.get_top_performers(load_data_from_s3(), days=days)
        elif method == 'volatility':
            result = analytics.get_volatility_analysis(load_data_from_s3(), days=days)
        elif method == 'summary':
            result = analytics.get_market_summary(load_data_from_s3())
        elif method == 'heatmap':
            result = analytics.get_monthly_returns(load_data_from_s3())
        elif method == 'pca':
            result = analytics.get_pca_analysis(load_data_from_s3())
        elif method == 'history':
            ticker = query_params.get('ticker', '').upper()
            if not ticker:
                result = {'error': 'Missing required parameter: ticker'}
            else:
                result = analytics.get_stock_history(load_data_from_s3(), ticker, days=days)
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
