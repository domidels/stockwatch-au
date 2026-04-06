"""
Lambda Function Handler for StockWatch AU
Connects to Snowflake to fetch ASX analytics data
"""

import json
import os
import logging
import boto3
from datetime import date, datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS Clients
secrets_client = boto3.client('secretsmanager')
s3_client = boto3.client('s3')

# Environment variables
SNOWFLAKE_SECRET_NAME = os.environ.get('SNOWFLAKE_SECRET_NAME')
S3_BUCKET = os.environ.get('S3_BUCKET')
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')


def get_snowflake_connection():
    """Get Snowflake connection credentials from Secrets Manager"""
    try:
        response = secrets_client.get_secret_value(SecretId=SNOWFLAKE_SECRET_NAME)
        secret = json.loads(response['SecretString'])
        return secret
    except Exception as e:
        logger.error(f"Failed to retrieve Snowflake credentials: {str(e)}")
        raise


def query_snowflake(query: str) -> list:
    """
    Execute query against Snowflake
    Returns list of dictionaries
    """
    try:
        import snowflake.connector
        from cryptography.hazmat.backends import default_backend
        from cryptography.hazmat.primitives.serialization import (
            load_pem_private_key, Encoding, PrivateFormat, NoEncryption
        )

        credentials = get_snowflake_connection()

        pem_bytes = credentials['private_key'].encode('utf-8')
        private_key = load_pem_private_key(pem_bytes, password=None, backend=default_backend())
        private_key_der = private_key.private_bytes(
            encoding=Encoding.DER,
            format=PrivateFormat.PKCS8,
            encryption_algorithm=NoEncryption()
        )

        conn = snowflake.connector.connect(
            account=credentials['account'],
            user=credentials['user'],
            private_key=private_key_der,
            database=credentials['database'],
            schema=credentials['schema'],
            warehouse=credentials['warehouse']
        )
        
        cursor = conn.cursor()
        cursor.execute(query)
        
        # Get column names
        columns = [desc[0] for desc in cursor.description]
        
        # Fetch all results and convert to list of dicts
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))
        
        conn.close()
        return results
        
    except Exception as e:
        logger.error(f"Snowflake query failed: {str(e)}")
        raise


def get_top_performers(days: int = None) -> dict:
    """Get top performing stocks by total return over the period"""
    date_filter = f"AND date >= DATEADD(day, -{days}, CURRENT_DATE())" if days else ""
    query = f"""
        WITH bounds AS (
            SELECT
                ticker,
                MIN(date) as start_date,
                MAX(date) as end_date
            FROM asx_stock_data
            WHERE 1=1 {date_filter}
            GROUP BY ticker
        ),
        prices AS (
            SELECT
                s.ticker,
                s.company_name,
                FIRST_VALUE(s.close) OVER (PARTITION BY s.ticker ORDER BY s.date) as first_close,
                LAST_VALUE(s.close)  OVER (PARTITION BY s.ticker ORDER BY s.date
                    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as last_close,
                ROUND(STDDEV(s.close) OVER (PARTITION BY s.ticker), 2) as volatility,
                COUNT(*) OVER (PARTITION BY s.ticker) as data_points
            FROM asx_stock_data s
            JOIN bounds b ON s.ticker = b.ticker
                AND s.date BETWEEN b.start_date AND b.end_date
        )
        SELECT DISTINCT
            ticker,
            company_name,
            ROUND(first_close, 2) as start_price,
            ROUND(last_close, 2) as end_price,
            ROUND((last_close - first_close) / first_close * 100, 2) as total_return_pct,
            volatility,
            data_points
        FROM prices
        WHERE data_points >= 20
        ORDER BY ticker ASC
    """
    results = query_snowflake(query)
    return {
        'type': 'top_performers',
        'data': results,
        'count': len(results)
    }


def get_volatility_analysis(days: int = None) -> dict:
    """Get volatility analysis"""
    date_filter = f"AND date >= DATEADD(day, -{days}, CURRENT_DATE())" if days else ""
    query = f"""
        WITH daily_returns AS (
            SELECT
                ticker,
                (close - LAG(close) OVER (PARTITION BY ticker ORDER BY date))
                / LAG(close) OVER (PARTITION BY ticker ORDER BY date) * 100 as daily_return_pct
            FROM asx_stock_data
            WHERE 1=1 {date_filter}
        )
        SELECT
            ticker,
            ROUND(STDDEV(daily_return_pct), 3) as volatility_std,
            ROUND(AVG(ABS(daily_return_pct)), 3) as avg_daily_change,
            ROUND(MIN(daily_return_pct), 2) as worst_day,
            ROUND(MAX(daily_return_pct), 2) as best_day
        FROM daily_returns
        WHERE daily_return_pct IS NOT NULL
        GROUP BY ticker
        HAVING COUNT(*) >= 20
        ORDER BY ticker ASC
    """
    results = query_snowflake(query)
    return {
        'type': 'volatility_analysis',
        'data': results,
        'count': len(results)
    }


def get_stock_history(ticker: str, days: int = None) -> dict:
    """Get price history for a specific ticker"""
    date_filter = f"AND date >= DATEADD(day, -{days}, CURRENT_DATE())" if days else ""
    query = f"""
        SELECT date, open, high, low, close, volume
        FROM asx_stock_data
        WHERE ticker = '{ticker}' {date_filter}
        ORDER BY date
    """
    results = query_snowflake(query)
    return {
        'type': 'history',
        'ticker': ticker,
        'data': results
    }


def get_monthly_returns() -> dict:
    """Get monthly returns per ticker for heatmap"""
    query = """
        WITH monthly_bounds AS (
            SELECT
                ticker,
                DATE_TRUNC('month', date) AS month,
                MIN(date) AS first_day,
                MAX(date) AS last_day
            FROM asx_stock_data
            GROUP BY ticker, DATE_TRUNC('month', date)
        ),
        monthly_prices AS (
            SELECT
                b.ticker,
                b.month,
                first_close.close AS open_price,
                last_close.close  AS close_price
            FROM monthly_bounds b
            JOIN asx_stock_data first_close
                ON first_close.ticker = b.ticker AND first_close.date = b.first_day
            JOIN asx_stock_data last_close
                ON last_close.ticker = b.ticker AND last_close.date = b.last_day
        )
        SELECT
            ticker,
            TO_CHAR(month, 'YYYY-MM') AS month,
            ROUND((close_price - open_price) / NULLIF(open_price, 0) * 100, 2) AS monthly_return
        FROM monthly_prices
        ORDER BY ticker, month
    """
    results = query_snowflake(query)
    return {
        'type': 'monthly_returns',
        'data': results,
        'count': len(results)
    }


def get_market_summary() -> dict:
    """Get market summary statistics"""
    query = """
        SELECT
            COUNT(DISTINCT ticker) as unique_stocks,
            COUNT(*) as total_records,
            MIN(date) as earliest_date,
            MAX(date) as latest_date,
            ROUND(AVG(close), 2) as avg_price,
            ROUND(AVG(volume), 0) as avg_volume
        FROM asx_stock_data
    """
    
    results = query_snowflake(query)
    return {
        'type': 'market_summary',
        'data': results[0] if results else {}
    }



def lambda_handler(event, context):
    """
    Main Lambda handler
    Routes requests based on method parameter
    """
    
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        # Extract method from path
        method = event.get('pathParameters', {}).get('method', 'summary').lower()
        query_params = event.get('queryStringParameters') or {}
        days = int(query_params['days']) if query_params.get('days', '').isdigit() else None

        # Route to appropriate handler
        if method == 'top_performers':
            result = get_top_performers(days=days)
        elif method == 'volatility':
            result = get_volatility_analysis(days=days)
        elif method == 'summary':
            result = get_market_summary()
        elif method == 'heatmap':
            result = get_monthly_returns()
        elif method == 'history':
            ticker = query_params.get('ticker', '').upper()
            if not ticker:
                result = {'error': 'Missing required parameter: ticker'}
            else:
                result = get_stock_history(ticker, days=days)
        else:
            result = {
                'error': f'Unknown method: {method}',
                'available_methods': ['summary', 'top_performers', 'volatility', 'history']
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
            'body': json.dumps({
                'error': str(e),
                'environment': ENVIRONMENT
            })
        }
