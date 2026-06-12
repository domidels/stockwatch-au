"""
Local backfill — downloads max available history and uploads to S3.
- Skips daily partition files that already exist in S3.
- Skips the consolidated file if it already exists.
Usage: cd /home/soms/portfolio/stockwatch-au && python scripts/backfill_local.py
"""
import os
import sys
import logging
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Use local AWS CLI credentials, not any stale keys from .env
for key in ('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN'):
    os.environ.pop(key, None)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
logger = logging.getLogger(__name__)

S3_BUCKET = os.environ.get('S3_BUCKET')
if not S3_BUCKET:
    raise RuntimeError("S3_BUCKET environment variable is required. Check your .env file.")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
os.environ['S3_BUCKET'] = S3_BUCKET

from ingestion import extract_data, upload_to_s3, update_consolidated, s3_key_for_date, CONSOLIDATED_KEY

import boto3
s3_client = boto3.client('s3')


def s3_object_exists(key: str) -> bool:
    try:
        s3_client.head_object(Bucket=S3_BUCKET, Key=key)
        return True
    except Exception:
        return False


if __name__ == '__main__':
    logger.info("Extracting max available history from yfinance...")
    df = extract_data("max")
    logger.info(f"Extracted {len(df)} rows across {df['date'].nunique()} trading days")

    uploaded = skipped = 0
    for date_str, group in df.groupby('date'):
        date = datetime.strptime(date_str, '%Y-%m-%d')
        key = s3_key_for_date(date)
        if s3_object_exists(key):
            skipped += 1
        else:
            upload_to_s3(group, date)
            uploaded += 1

    logger.info(f"Daily files: {uploaded} uploaded, {skipped} already existed")

    if s3_object_exists(CONSOLIDATED_KEY):
        logger.info("Consolidated file already exists — skipping")
    else:
        logger.info("Creating consolidated file...")
        update_consolidated(df)
        logger.info("Consolidated file created.")

    logger.info("Backfill complete.")
