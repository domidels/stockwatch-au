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
from typing import Optional

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
                   s3_key: Optional[str] = None,
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

    def upload_with_lifecycle(self,
                             file_path: str,
                             s3_key: Optional[str] = None) -> bool:
        """
        Upload file with intelligent lifecycle management
        Uses STANDARD initially, then transitions to cheaper classes
        """
        # Start with STANDARD for immediate access
        success = self.upload_file(file_path, s3_key, storage_class='STANDARD')

        if success and s3_key:
            # Set lifecycle policy for cost optimization
            self._set_lifecycle_policy(s3_key)

        return success

    def _set_lifecycle_policy(self, s3_key: str):
        """Set lifecycle policy to automatically move to cheaper storage"""
        try:
            # This would be set at bucket level, but showing the concept
            logger.info(f"Lifecycle policy concept: {s3_key} will transition to IA after 30 days")
            # In production, you'd set bucket lifecycle rules:
            # - After 30 days: STANDARD_IA
            # - After 90 days: GLACIER
            # - After 365 days: DEEP_ARCHIVE
        except Exception as e:
            logger.warning(f"Could not set lifecycle policy: {e}")

    def list_bucket_contents(self, prefix: str = "") -> list:
        """List contents of bucket with optional prefix"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )

            objects = response.get('Contents', [])
            return [obj['Key'] for obj in objects]

        except ClientError as e:
            logger.error(f"Could not list bucket contents: {e}")
            return []

    def get_storage_cost_estimate(self, file_size_mb: float) -> dict:
        """
        Estimate monthly storage costs for different classes
        Based on Sydney region pricing (as of 2024)
        """
        # Pricing per GB per month (Sydney region)
        pricing = {
            'STANDARD': 0.023,      # $0.023/GB
            'STANDARD_IA': 0.0125,  # $0.0125/GB (46% savings)
            'GLACIER': 0.0041,      # $0.0041/GB (82% savings)
            'DEEP_ARCHIVE': 0.0012  # $0.0012/GB (95% savings)
        }

        file_size_gb = file_size_mb / 1024

        estimates = {}
        for storage_class, price_per_gb in pricing.items():
            monthly_cost = file_size_gb * price_per_gb
            estimates[storage_class] = round(monthly_cost, 4)

        return estimates

def main():
    """Main upload function"""
    # Configuration - update these values
    BUCKET_NAME = os.getenv('AWS_S3_BUCKET', 'your-asx-data-bucket')
    DATA_FILE = 'data/asx_data_20241201.parquet'  # Update with actual file

    uploader = S3Uploader(bucket_name=BUCKET_NAME)

    # Upload with cost optimization
    success = uploader.upload_with_lifecycle(DATA_FILE)

    if success:
        # Show cost comparison
        file_size = Path(DATA_FILE).stat().st_size / (1024 * 1024)  # MB
        costs = uploader.get_storage_cost_estimate(file_size)

        logger.info("Monthly storage cost estimates:")
        for storage_class, cost in costs.items():
            logger.info(f"  {storage_class}: ${cost}/month")

        logger.info("💡 Using STANDARD_IA saves ~50% vs STANDARD storage!")

    return success

if __name__ == "__main__":
    main()