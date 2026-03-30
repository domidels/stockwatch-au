#!/usr/bin/env python3
"""
Quick Test Script for StockWatch AU
Validates all components are working correctly
"""

import os
import sys
import logging
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_python_environment():
    """Test Python environment and dependencies"""
    logger.info("Testing Python environment...")

    try:
        import pandas as pd
        logger.info(f"✅ Pandas {pd.__version__}")
    except ImportError:
        logger.error("❌ Pandas not installed")
        return False

    try:
        import yfinance as yf
        logger.info(f"✅ yfinance {yf.__version__}")
    except ImportError:
        logger.error("❌ yfinance not installed")
        return False

    try:
        import boto3
        logger.info(f"✅ boto3 {boto3.__version__}")
    except ImportError:
        logger.error("❌ boto3 not installed")
        return False

    return True

def test_aws_connection():
    """Test AWS S3 connection"""
    logger.info("Testing AWS S3 connection...")

    bucket_name = os.getenv('S3_BUCKET_NAME')
    if not bucket_name:
        logger.warning("⚠️  S3_BUCKET_NAME not set, skipping AWS test")
        return True

    try:
        import boto3
        s3 = boto3.client('s3')
        s3.head_bucket(Bucket=bucket_name)
        logger.info(f"✅ S3 bucket {bucket_name} accessible")
        return True
    except Exception as e:
        logger.error(f"❌ S3 connection failed: {e}")
        return False

def test_snowflake_connection():
    """Test Snowflake connection"""
    logger.info("Testing Snowflake connection...")

    required_env = ['SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PASSWORD']
    missing = [var for var in required_env if not os.getenv(var)]

    if missing:
        logger.warning(f"⚠️  Missing Snowflake env vars: {missing}, skipping test")
        return True

    try:
        import snowflake.connector
        conn = snowflake.connector.connect(
            account=os.getenv('SNOWFLAKE_ACCOUNT'),
            user=os.getenv('SNOWFLAKE_USER'),
            password=os.getenv('SNOWFLAKE_PASSWORD')
        )
        conn.close()
        logger.info("✅ Snowflake connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Snowflake connection failed: {e}")
        return False

def test_data_extraction():
    """Test ASX data extraction (limited)"""
    logger.info("Testing ASX data extraction...")

    try:
        from scripts.extract_asx_data import ASXDataExtractor

        extractor = ASXDataExtractor()
        # Test with just 2 stocks for quick validation
        df = extractor.extract_all_stocks(stocks=['CBA.AX', 'BHP.AX'], period="1mo")

        if not df.empty:
            logger.info(f"✅ Data extraction successful: {len(df)} records")
            return True
        else:
            logger.error("❌ No data extracted")
            return False

    except Exception as e:
        logger.error(f"❌ Data extraction failed: {e}")
        return False

def test_file_operations():
    """Test file system operations"""
    logger.info("Testing file operations...")

    project_root = Path(__file__).parent.parent

    required_files = [
        'README.md',
        'requirements.txt',
        '.env.example',
        'scripts/extract_asx_data.py',
        'scripts/upload_to_s3.py',
        'scripts/snowflake_loader.py',
        'snowflake/schemas/asx_schema.sql',
        'snowflake/queries/asx_analytics.sql',
        'docs/setup_guide.md'
    ]

    missing_files = []
    for file_path in required_files:
        if not (project_root / file_path).exists():
            missing_files.append(file_path)

    if missing_files:
        logger.error(f"❌ Missing files: {missing_files}")
        return False

    logger.info("✅ All required files present")
    return True

def main():
    """Run all tests"""
    logger.info("🚀 Starting StockWatch AU validation tests...")
    logger.info("=" * 50)

    tests = [
        ("Python Environment", test_python_environment),
        ("File Structure", test_file_operations),
        ("AWS S3 Connection", test_aws_connection),
        ("Snowflake Connection", test_snowflake_connection),
        ("Data Extraction", test_data_extraction),
    ]

    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"❌ {test_name} crashed: {e}")
            results.append((test_name, False))

    logger.info("=" * 50)
    logger.info("📊 Test Results:")

    passed = 0
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"  {test_name}: {status}")
        if result:
            passed += 1

    logger.info("=" * 50)
    logger.info(f"🎯 Overall: {passed}/{total} tests passed")

    if passed == total:
        logger.info("🎉 All tests passed! Ready to run the pipeline.")
        return 0
    else:
        logger.warning("⚠️  Some tests failed. Check configuration and try again.")
        return 1

if __name__ == "__main__":
    sys.exit(main())