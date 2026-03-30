"""
Lambda Function Handler for StockWatch AU
Connects to Snowflake to fetch ASX analytics data
"""

import json
import os
import logging
import boto3

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


def get_top_performers() -> dict:
    """Get top performing stocks"""
    query = """
        SELECT
            ticker,
            company_name,
            ROUND(AVG(close_price), 2) as avg_price,
            ROUND(MAX(close_price), 2) as max_price,
            ROUND(MIN(close_price), 2) as min_price,
            ROUND(STDDEV(close_price), 2) as volatility,
            COUNT(*) as data_points
        FROM asx_stock_data
        GROUP BY ticker, company_name
        HAVING COUNT(*) >= 30
        ORDER BY avg_price DESC
        LIMIT 10
    """
    
    results = query_snowflake(query)
    return {
        'type': 'top_performers',
        'data': results,
        'count': len(results)
    }


def get_volatility_analysis() -> dict:
    """Get volatility analysis"""
    query = """
        WITH daily_returns AS (
            SELECT
                ticker,
                (close_price - LAG(close_price) OVER (PARTITION BY ticker ORDER BY date))
                / LAG(close_price) OVER (PARTITION BY ticker ORDER BY date) * 100 as daily_return_pct
            FROM asx_stock_data
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
        HAVING COUNT(*) >= 30
        ORDER BY volatility_std DESC
        LIMIT 10
    """
    
    results = query_snowflake(query)
    return {
        'type': 'volatility_analysis',
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
            ROUND(AVG(close_price), 2) as avg_price,
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
        
        # Route to appropriate handler
        if method == 'top_performers':
            result = get_top_performers()
        elif method == 'volatility':
            result = get_volatility_analysis()
        elif method == 'summary':
            result = get_market_summary()
        else:
            result = {
                'error': f'Unknown method: {method}',
                'available_methods': ['summary', 'top_performers', 'volatility']
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json'
            },
            'body': json.dumps(result)
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
