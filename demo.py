#!/usr/bin/env python3
"""
StockWatch AU Demo Script
Quick demonstration of the complete data pipeline
"""

import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_demo():
    """Run a complete demo of the StockWatch AU pipeline"""
    logger.info("🚀 Starting StockWatch AU Demo")
    logger.info("=" * 60)

    # Step 1: Data Extraction
    logger.info("📊 Step 1: Extracting ASX Data...")
    try:
        from scripts.extract_asx_data import ASXDataExtractor

        extractor = ASXDataExtractor()
        # Demo with top 5 stocks, 3 months data
        demo_stocks = ['CBA.AX', 'BHP.AX', 'MQG.AX', 'RIO.AX', 'CSL.AX']

        df = extractor.extract_all_stocks(stocks=demo_stocks, period="3mo")
        parquet_file = extractor.save_to_parquet(df)

        logger.info(f"✅ Extracted {len(df)} records for {len(demo_stocks)} stocks")
        logger.info(f"📁 Data saved to: {parquet_file}")

    except Exception as e:
        logger.error(f"❌ Data extraction failed: {e}")
        return False

    # Step 2: Cost Analysis
    logger.info("\n💰 Step 2: Cost Analysis...")
    try:
        from scripts.upload_to_s3 import S3Uploader

        uploader = S3Uploader()
        file_size_mb = Path(parquet_file).stat().st_size / (1024 * 1024)
        cost_estimates = uploader.get_storage_cost_estimate(file_size_mb)

        logger.info(f"📏 File size: {file_size_mb:.2f} MB")
        logger.info("💵 Monthly storage costs:")
        for storage_class, cost in cost_estimates.items():
            logger.info(f"   {storage_class}: ${cost:.4f}/month")

        logger.info("💡 Recommendation: Use STANDARD_IA for 46% savings!")

    except Exception as e:
        logger.warning(f"⚠️  Cost analysis skipped: {e}")

    # Step 3: Data Preview
    logger.info("\n👀 Step 3: Data Preview...")
    try:
        logger.info("📋 Sample data:")
        preview = df.head(10)[['date', 'ticker', 'company_name', 'close_price', 'volume']]
        logger.info("\n" + str(preview))

        # Basic stats
        logger.info("\n📊 Basic Statistics:")
        logger.info(f"   Date range: {df['date'].min()} to {df['date'].max()}")
        logger.info(f"   Unique stocks: {df['ticker'].nunique()}")
        logger.info(f"   Total records: {len(df)}")
        logger.info(f"   Avg price: ${df['close_price'].mean():.2f}")
        logger.info(f"   Total volume: {df['volume'].sum():,.0f}")

    except Exception as e:
        logger.error(f"❌ Data preview failed: {e}")

    # Step 4: Analytics Preview
    logger.info("\n📈 Step 4: Analytics Preview...")
    try:
        # Simple analytics demo
        stock_performance = df.groupby('ticker').agg({
            'close_price': ['mean', 'min', 'max', 'std'],
            'volume': 'sum'
        }).round(2)

        stock_performance.columns = ['avg_price', 'min_price', 'max_price', 'volatility', 'total_volume']
        stock_performance = stock_performance.sort_values('avg_price', ascending=False)

        logger.info("🏆 Stock Performance Summary:")
        logger.info("\n" + str(stock_performance))

    except Exception as e:
        logger.error(f"❌ Analytics preview failed: {e}")

    logger.info("\n" + "=" * 60)
    logger.info("🎉 Demo completed successfully!")
    logger.info("\n📋 Next Steps:")
    logger.info("   1. Configure AWS credentials in .env")
    logger.info("   2. Set up Snowflake account")
    logger.info("   3. Run: python scripts/upload_to_s3.py")
    logger.info("   4. Run: python scripts/snowflake_loader.py")
    logger.info("   5. Execute queries in snowflake/queries/")
    logger.info("\n💰 Estimated monthly cost: <$2")
    logger.info("⏱️  Setup time: ~30 minutes")

    return True

def main():
    """Main demo function"""
    # Check if we're in the right directory
    if not Path('scripts/extract_asx_data.py').exists():
        logger.error("❌ Please run this script from the stockwatch-au project root")
        return 1

    # Check Python environment
    try:
        import importlib
        if not importlib.util.find_spec('pandas'):
            raise ImportError("pandas not found")
        if not importlib.util.find_spec('yfinance'):
            raise ImportError("yfinance not found")
        if not importlib.util.find_spec('boto3'):
            raise ImportError("boto3 not found")
    except ImportError as e:
        logger.error("❌ Missing dependencies. Run: pip install -r requirements.txt")
        logger.error(f"   Error: {e}")
        return 1

    # Run demo
    success = run_demo()
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())