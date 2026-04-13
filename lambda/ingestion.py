"""
Lambda Ingestion Handler for StockWatch AU
Triggered daily by EventBridge after ASX close (16:30 Sydney)
- First run: loads 6 months of historical data
- Subsequent runs: loads previous day only (incremental)
"""

import json
import os
import io
import logging
import boto3
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
secrets_client = boto3.client('secretsmanager')

S3_BUCKET = os.environ.get('S3_BUCKET')
SNOWFLAKE_SECRET_NAME = os.environ.get('SNOWFLAKE_SECRET_NAME')

ASX_STOCKS = [
    'CBA.AX', 'BHP.AX', 'CSL.AX', 'MQG.AX', 'WBC.AX',
    'NAB.AX', 'RIO.AX', 'ANZ.AX', 'WES.AX', 'GMG.AX',
    'TLS.AX', 'COL.AX', 'ALL.AX', 'REA.AX', 'STO.AX',
    'XRO.AX', 'WOW.AX', 'FMG.AX', 'SHL.AX', 'COH.AX',
]


def get_snowflake_credentials():
    """Retrieve Snowflake connection parameters from AWS Secrets Manager."""
    response = secrets_client.get_secret_value(SecretId=SNOWFLAKE_SECRET_NAME)
    return json.loads(response['SecretString'])


def get_snowflake_connection(credentials):
    """
    Open a Snowflake connection using private-key authentication.

    The private key is stored as a PEM string inside the Secrets Manager
    JSON payload, then converted to DER format as required by the connector.
    """
    import snowflake.connector
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives.serialization import (
        load_pem_private_key, Encoding, PrivateFormat, NoEncryption
    )

    pem_bytes = credentials['private_key'].encode('utf-8')
    private_key = load_pem_private_key(pem_bytes, password=None, backend=default_backend())
    private_key_der = private_key.private_bytes(
        encoding=Encoding.DER,
        format=PrivateFormat.PKCS8,
        encryption_algorithm=NoEncryption()
    )

    return snowflake.connector.connect(
        account=credentials['account'],
        user=credentials['user'],
        private_key=private_key_der,
        warehouse=credentials['warehouse']
        # database/schema set after CREATE DATABASE in ensure_snowflake_table()
    )


def extract_data(period: str):
    """Extract ASX stock data via yfinance"""
    import yfinance as yf
    import pandas as pd

    logger.info(f"Extracting data for {len(ASX_STOCKS)} stocks, period={period}")

    all_data = []
    for ticker in ASX_STOCKS:
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period, interval="1d")

            if hist.empty:
                logger.warning(f"No data for {ticker}")
                continue

            hist['ticker'] = ticker
            hist['company_name'] = stock.info.get('longName', 'Unknown')
            hist = hist.reset_index()
            hist = hist.rename(columns={
                'Date': 'date', 'Open': 'open', 'High': 'high',
                'Low': 'low', 'Close': 'close', 'Volume': 'volume',
                'Dividends': 'dividends', 'Stock Splits': 'stock_splits'
            })
            hist['date'] = hist['date'].dt.tz_localize(None).dt.strftime('%Y-%m-%d')
            all_data.append(hist)

        except Exception as e:
            logger.error(f"Error extracting {ticker}: {e}")
            continue

    if not all_data:
        raise RuntimeError("No data extracted")

    return pd.concat(all_data, ignore_index=True).sort_values(['ticker', 'date'])


def s3_key_for_date(date: datetime) -> str:
    """Build partitioned S3 key — Hive format for future Athena compatibility"""
    return (
        f"raw/asx/"
        f"year={date.strftime('%Y')}/"
        f"month={date.strftime('%m')}/"
        f"day={date.strftime('%d')}/"
        f"asx_data.parquet"
    )


def upload_to_s3(df, run_date: datetime):
    """Upload DataFrame as parquet to partitioned S3 path"""
    import pyarrow as pa
    import pyarrow.parquet as pq

    s3_key = s3_key_for_date(run_date)

    buffer = io.BytesIO()
    table = pa.Table.from_pandas(df, preserve_index=False)
    pq.write_table(table, buffer, compression='snappy')
    buffer.seek(0)

    s3_client.put_object(
        Bucket=S3_BUCKET,
        Key=s3_key,
        Body=buffer.getvalue(),
        ContentType='application/octet-stream',
        Metadata={'source': 'asx-ingestion-lambda', 'rows': str(len(df))}
    )

    logger.info(f"Uploaded {len(df)} rows to s3://{S3_BUCKET}/{s3_key}")
    return s3_key


def ensure_snowflake_table(conn):
    """Create database, schema and table if not exists"""
    cur = conn.cursor()
    cur.execute("CREATE DATABASE IF NOT EXISTS ASX_ANALYTICS")
    cur.execute("USE DATABASE ASX_ANALYTICS")
    cur.execute("CREATE SCHEMA IF NOT EXISTS FINANCE")
    cur.execute("USE SCHEMA FINANCE")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS asx_stock_data (
            date         DATE,
            ticker       VARCHAR(10),
            company_name VARCHAR(255),
            open         FLOAT,
            high         FLOAT,
            low          FLOAT,
            close        FLOAT,
            volume       BIGINT,
            dividends    FLOAT DEFAULT 0,
            stock_splits FLOAT DEFAULT 0,
            loaded_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.close()


def get_s3_credentials():
    """Get S3 credentials from Secrets Manager for Snowflake stage"""
    s3_secret_name = os.environ.get('S3_SECRET_NAME', 'stockwatch-au-s3-credentials')
    response = secrets_client.get_secret_value(SecretId=s3_secret_name)
    return json.loads(response['SecretString'])


def load_to_snowflake(conn, s3_key: str, credentials: dict):
    """Load parquet file from S3 into Snowflake via external stage"""
    cur = conn.cursor()

    s3_creds = get_s3_credentials()

    cur.execute(f"""
        CREATE OR REPLACE TEMPORARY STAGE asx_stage
        URL = 's3://{S3_BUCKET}/{s3_key}'
        CREDENTIALS = (
            AWS_KEY_ID     = '{s3_creds["access_key"]}'
            AWS_SECRET_KEY = '{s3_creds["secret_key"]}'
        )
        FILE_FORMAT = (TYPE = PARQUET COMPRESSION = SNAPPY)
    """)

    cur.execute("""
        MERGE INTO asx_stock_data AS target
        USING (
            SELECT
                $1:date::DATE         AS date,
                $1:ticker::VARCHAR    AS ticker,
                $1:company_name::VARCHAR AS company_name,
                $1:open::FLOAT        AS open,
                $1:high::FLOAT        AS high,
                $1:low::FLOAT         AS low,
                $1:close::FLOAT       AS close,
                $1:volume::BIGINT     AS volume,
                $1:dividends::FLOAT   AS dividends,
                $1:stock_splits::FLOAT AS stock_splits
            FROM @asx_stage
        ) AS source
        ON target.date = source.date AND target.ticker = source.ticker
        WHEN NOT MATCHED THEN INSERT (
            date, ticker, company_name, open, high, low, close,
            volume, dividends, stock_splits
        ) VALUES (
            source.date, source.ticker, source.company_name,
            source.open, source.high, source.low, source.close,
            source.volume, source.dividends, source.stock_splits
        )
    """)

    result = cur.fetchone()
    logger.info(f"Snowflake COPY INTO result: {result}")
    cur.close()


def is_table_empty(conn) -> bool:
    """Check if asx_stock_data has any rows"""
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM asx_stock_data")
    count = cur.fetchone()[0]
    cur.close()
    return count == 0


def lambda_handler(event, context):
    """
    Main Lambda entry point, triggered daily by EventBridge after ASX close.

    On the first invocation (empty table) it fetches 6 months of history.
    On subsequent runs it fetches only the previous trading day (incremental).
    A specific period can be forced by passing {"period": "3y"} in the event
    payload, which is useful for one-off backfills.
    """
    run_date = datetime.utcnow()

    try:
        # 1. Setup Snowflake + auto-detect initial vs incremental
        credentials = get_snowflake_credentials()
        conn = get_snowflake_connection(credentials)
        ensure_snowflake_table(conn)

        initial_load = is_table_empty(conn)

        # period can be forced via event payload (e.g. {"period": "3y"} for backfill)
        forced_period = event.get('period')
        if forced_period:
            period = forced_period
            logger.info(f"Forced period from event: {period}")
        elif initial_load:
            period = "6mo"
            logger.info("Table is empty — initial load, fetching 6 months of history")
        else:
            period = "2d"
            logger.info("Incremental load — fetching latest day")

        df = extract_data(period)
        logger.info(f"Extracted {len(df)} rows")

        # Upload to S3 + load into Snowflake — one file per day
        bulk_load = initial_load or bool(forced_period)
        if bulk_load:
            # Split by actual data date for proper partitioning
            s3_keys = []
            for date_str, group in df.groupby('date'):
                date = datetime.strptime(date_str, '%Y-%m-%d')
                s3_key = upload_to_s3(group, date)
                load_to_snowflake(conn, s3_key, credentials)
                s3_keys.append(s3_key)
            logger.info(f"Initial load: {len(s3_keys)} daily files created")
            result_key = f"{len(s3_keys)} files"
        else:
            s3_key = upload_to_s3(df, run_date)
            load_to_snowflake(conn, s3_key, credentials)
            result_key = s3_key

        conn.close()

        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'rows': len(df),
                's3_key': result_key,
                'run_date': run_date.isoformat()
            })
        }

    except Exception as e:
        logger.error(f"Ingestion failed: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
