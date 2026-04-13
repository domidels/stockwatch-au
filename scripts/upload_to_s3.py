#!/usr/bin/env python3
"""
S3 Upload Script with Cost Optimization
Uploads ASX data to AWS S3 with intelligent storage class selection
"""

import os
import logging
import boto3
from botocore.exceptions import ClientError
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class S3Uploader:
    """S3 uploader optimized for minimal costs"""

    def __init__(self, bucket_name: str, region: str = 'ap-southeast-2'):
        """
        Initialize S3 uploader
        Args:
            bucket_name: S3 bucket name
            region: AWS region (Sydney for AU data)
        """
        self.bucket_name = bucket_name
        self.region = region

        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            region_name=region
        )

        # Test connection
        try:
            self.s3_client.head_bucket(Bucket=bucket_name)
            logger.info(f"Connected to S3 bucket: {bucket_name}")
        except ClientError as e:
            logger.error(f"Cannot connect to bucket {bucket_name}: {e}")
            raise

    def upload_file(self,
                   file_path: str,
                   s3_key: str = None,
                   storage_class: str = 'STANDARD_IA') -> bool:
        """
        Upload file to S3 with cost-optimized storage class

        Args:
            file_path: Local file path
            s3_key: S3 object key (defaults to filename)
            storage_class: S3 storage class (STANDARD_IA for cost savings)

        Returns:
            bool: Success status
        """
        file_path = Path(file_path)

        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return False

        if s3_key is None:
            s3_key = file_path.name

        try:
            # Calculate file size for logging
            file_size = file_path.stat().st_size / (1024 * 1024)  # MB

            logger.info(f"Uploading {file_path} ({file_size:.2f} MB) to s3://{self.bucket_name}/{s3_key}")

            # Upload with cost-optimized settings
            with open(file_path, 'rb') as file_data:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=file_data,
                    StorageClass=storage_class,  # Cost optimization
                    ContentType='application/octet-stream',
                    Metadata={
                        'source': 'asx-data-extraction',
                        'upload_date': str(file_path.stat().st_mtime),
                        'compression': 'snappy'
                    }
                )

            logger.info(f"Successfully uploaded to {storage_class} class")
            return True

        except ClientError as e:
            logger.error(f"Upload failed: {e}")
            return False

def main():
    """Upload a local parquet file to S3."""
    BUCKET_NAME = os.getenv('S3_BUCKET')
    DATA_FILE = os.getenv('DATA_FILE', 'data/asx_data.parquet')

    if not BUCKET_NAME:
        raise RuntimeError("S3_BUCKET environment variable is required.")

    uploader = S3Uploader(bucket_name=BUCKET_NAME)
    return uploader.upload_file(DATA_FILE)

if __name__ == "__main__":
    main()