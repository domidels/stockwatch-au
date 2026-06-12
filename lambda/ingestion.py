"""
Lambda Ingestion Handler for StockWatch AU
Triggered daily by EventBridge after ASX close (16:30 Sydney)
- First run: loads 6 months of historical data
- Subsequent runs: loads previous day only (incremental)
"""

import io
import json
import logging
import os
from datetime import datetime

import boto3
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import yfinance as yf

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')

S3_BUCKET = os.environ.get('S3_BUCKET')
CONSOLIDATED_KEY = 'raw/asx/consolidated/asx_all.parquet'

ASX_STOCKS = [
    'CBA.AX', 'BHP.AX', 'CSL.AX', 'MQG.AX', 'WBC.AX',
    'NAB.AX', 'RIO.AX', 'ANZ.AX', 'WES.AX', 'GMG.AX',
    'TLS.AX', 'COL.AX', 'ALL.AX', 'REA.AX', 'STO.AX',
    'XRO.AX', 'WOW.AX', 'FMG.AX', 'SHL.AX', 'COH.AX',
]


def extract_data(period: str):
    """Extract ASX stock data via yfinance"""
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


def update_consolidated(new_df: pd.DataFrame):
    """Merge new rows into the single consolidated Parquet file the API handler reads."""
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=CONSOLIDATED_KEY)
        existing = pd.read_parquet(io.BytesIO(response['Body'].read()))
        combined = pd.concat([existing, new_df], ignore_index=True)
        combined = combined.drop_duplicates(subset=['date', 'ticker'], keep='last')
    except Exception:
        combined = new_df.copy()

    combined = combined.sort_values(['date', 'ticker'])
    buffer = io.BytesIO()
    table = pa.Table.from_pandas(combined, preserve_index=False)
    pq.write_table(table, buffer, compression='snappy')
    buffer.seek(0)

    s3_client.put_object(
        Bucket=S3_BUCKET,
        Key=CONSOLIDATED_KEY,
        Body=buffer.getvalue(),
        ContentType='application/octet-stream'
    )
    logger.info(f"Consolidated file updated: {len(combined)} total rows")


def s3_has_data() -> bool:
    """Check whether any Parquet data already exists in S3."""
    response = s3_client.list_objects_v2(Bucket=S3_BUCKET, Prefix='raw/asx/', MaxKeys=1)
    return response.get('KeyCount', 0) > 0


def lambda_handler(event, context):
    """
    Main Lambda entry point, triggered daily by EventBridge after ASX close.

    On the first invocation (empty S3) it fetches 6 months of history.
    On subsequent runs it fetches only the previous trading day (incremental).
    A specific period can be forced by passing {"period": "3y"} in the event
    payload, which is useful for one-off backfills.
    """
    run_date = datetime.utcnow()

    try:
        forced_period = event.get('period')
        if forced_period:
            period = forced_period
            logger.info(f"Forced period from event: {period}")
        elif not s3_has_data():
            period = "6mo"
            logger.info("S3 is empty — initial load, fetching 6 months of history")
        else:
            period = "2d"
            logger.info("Incremental load — fetching latest day")

        df = extract_data(period)
        logger.info(f"Extracted {len(df)} rows")

        bulk_load = bool(forced_period) or period == "6mo"
        if bulk_load:
            s3_keys = []
            for date_str, group in df.groupby('date'):
                date = datetime.strptime(date_str, '%Y-%m-%d')
                s3_key = upload_to_s3(group, date)
                s3_keys.append(s3_key)
            logger.info(f"Bulk load: {len(s3_keys)} daily files created")
            result_key = f"{len(s3_keys)} files"
        else:
            s3_key = upload_to_s3(df, run_date)
            result_key = s3_key

        update_consolidated(df)

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
