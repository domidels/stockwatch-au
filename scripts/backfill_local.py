"""
Local 3-year backfill — bypasses Lambda/Secrets Manager.
Usage: cd /home/soms/portfolio/stockwatch-au && python scripts/backfill_local.py
"""
import os, sys, logging
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Use local AWS CLI credentials, not any stale keys from .env
for key in ('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN'):
    os.environ.pop(key, None)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
logger = logging.getLogger(__name__)

# Read from environment — set S3_BUCKET in your .env file (see .env.example).
S3_BUCKET = os.environ.get('S3_BUCKET')
if not S3_BUCKET:
    raise RuntimeError("S3_BUCKET environment variable is required. Check your .env file.")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
os.environ['S3_BUCKET'] = S3_BUCKET

from ingestion import extract_data, upload_to_s3, ensure_snowflake_table

import boto3
import snowflake.connector
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.serialization import load_pem_private_key, Encoding, PrivateFormat, NoEncryption


def get_local_snowflake_connection():
    key_path = os.path.join(os.path.dirname(__file__), '..', os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'].strip())
    with open(key_path, 'rb') as f:
        private_key = load_pem_private_key(f.read(), password=None, backend=default_backend())
    private_key_der = private_key.private_bytes(Encoding.DER, PrivateFormat.PKCS8, NoEncryption())

    return snowflake.connector.connect(
        account=os.environ['SNOWFLAKE_ACCOUNT'],
        user=os.environ['SNOWFLAKE_USER'],
        private_key=private_key_der,
        warehouse=os.environ['SNOWFLAKE_WAREHOUSE'],
    )


def get_local_aws_credentials():
    session = boto3.session.Session()
    creds = session.get_credentials().get_frozen_credentials()
    return creds.access_key, creds.secret_key


def load_to_snowflake_local(conn, s3_key):
    access_key, secret_key = get_local_aws_credentials()
    cur = conn.cursor()
    cur.execute(f"""
        CREATE OR REPLACE TEMPORARY STAGE asx_stage
        URL = 's3://{S3_BUCKET}/{s3_key}'
        CREDENTIALS = (AWS_KEY_ID='{access_key}' AWS_SECRET_KEY='{secret_key}')
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
            date, ticker, company_name, open, high, low, close, volume, dividends, stock_splits
        ) VALUES (
            source.date, source.ticker, source.company_name,
            source.open, source.high, source.low, source.close,
            source.volume, source.dividends, source.stock_splits
        )
    """)
    result = cur.fetchone()
    logger.info(f"MERGE result: {result}")
    cur.close()


if __name__ == '__main__':
    logger.info("Connecting to Snowflake...")
    conn = get_local_snowflake_connection()
    ensure_snowflake_table(conn)

    logger.info("Extracting 3 years of data from yfinance...")
    df = extract_data("3y")
    logger.info(f"Extracted {len(df)} rows across {df['date'].nunique()} days")

    for date_str, group in df.groupby('date'):
        date = datetime.strptime(date_str, '%Y-%m-%d')
        s3_key = upload_to_s3(group, date)
        load_to_snowflake_local(conn, s3_key)

    conn.close()
    logger.info("Backfill complete.")
