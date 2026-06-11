"""
Local 3-year backfill — bypasses Lambda.
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

from ingestion import extract_data, upload_to_s3


if __name__ == '__main__':
    logger.info("Extracting 3 years of data from yfinance...")
    df = extract_data("3y")
    logger.info(f"Extracted {len(df)} rows across {df['date'].nunique()} days")

    for date_str, group in df.groupby('date'):
        date = datetime.strptime(date_str, '%Y-%m-%d')
        upload_to_s3(group, date)

    logger.info("Backfill complete.")
