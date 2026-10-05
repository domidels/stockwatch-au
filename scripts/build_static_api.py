"""
Regenerate the pre-computed dashboard JSON (s3://<bucket>/api/*.json) from the
existing consolidated Parquet file, without calling yfinance.
The ingestion Lambda does this automatically after every run; use this script
after changing analytics.py or right after the first deployment.
Usage: python scripts/build_static_api.py
"""
import io
import logging
import os
import sys

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

import pandas as pd  # noqa: E402
from ingestion import CONSOLIDATED_KEY, publish_static_api, s3_client  # noqa: E402

if __name__ == '__main__':
    response = s3_client.get_object(Bucket=S3_BUCKET, Key=CONSOLIDATED_KEY)
    df = pd.read_parquet(io.BytesIO(response['Body'].read()))
    logger.info(f"Loaded {len(df)} rows from consolidated file")
    publish_static_api(df)
