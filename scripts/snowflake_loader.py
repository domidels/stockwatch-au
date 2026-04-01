#!/usr/bin/env python3
"""
Snowflake Data Loader
Loads ASX data from S3 into Snowflake with cost optimization
"""

import os
import logging
import snowflake.connector
from snowflake.connector import DictCursor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SnowflakeLoader:
    """Snowflake data loader with cost optimization"""

    def __init__(self,
                 account: str,
                 user: str,
                 private_key_path: str,
                 warehouse: str = 'COMPUTE_WH',
                 database: str = 'ASX_ANALYTICS',
                 schema: str = 'PUBLIC'):
        """
        Initialize Snowflake connection
        """
        self.account = account
        self.user = user
        self.private_key_path = private_key_path
        self.warehouse = warehouse
        self.database = database
        self.schema = schema

        self.connection = None

    def connect(self):
        """Establish Snowflake connection"""
        try:
            from cryptography.hazmat.backends import default_backend
            from cryptography.hazmat.primitives.serialization import (
                load_pem_private_key, Encoding, PrivateFormat, NoEncryption
            )

            with open(self.private_key_path, 'rb') as f:
                private_key = load_pem_private_key(f.read(), password=None, backend=default_backend())

            private_key_der = private_key.private_bytes(
                encoding=Encoding.DER,
                format=PrivateFormat.PKCS8,
                encryption_algorithm=NoEncryption()
            )

            self.connection = snowflake.connector.connect(
                account=self.account,
                user=self.user,
                private_key=private_key_der,
                warehouse=self.warehouse,
                database=self.database,
                schema=self.schema
            )
            logger.info("Connected to Snowflake")
        except Exception as e:
            logger.error(f"Failed to connect to Snowflake: {e}")
            raise

    def disconnect(self):
        """Close Snowflake connection"""
        if self.connection:
            self.connection.close()
            logger.info("Disconnected from Snowflake")

    def create_database_and_schema(self):
        """Create database and schema if they don't exist"""
        try:
            cursor = self.connection.cursor()

            # Create database (if not exists)
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {self.database}")
            logger.info(f"Database {self.database} ready")

            # Create schema (if not exists)
            cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {self.schema}")
            logger.info(f"Schema {self.schema} ready")

            cursor.close()

        except Exception as e:
            logger.error(f"Failed to create database/schema: {e}")
            raise

    def create_asx_table(self):
        """Create ASX stock data table with optimized structure"""
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS asx_stock_data (
            date DATE,
            ticker VARCHAR(10),
            company_name VARCHAR(255),
            open_price FLOAT,
            high_price FLOAT,
            low_price FLOAT,
            close_price FLOAT,
            volume BIGINT,
            dividends FLOAT DEFAULT 0,
            stock_splits FLOAT DEFAULT 0,
            extraction_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        COMMENT = 'ASX stock market data - optimized for analytics'
        """

        try:
            cursor = self.connection.cursor()
            cursor.execute(create_table_sql)
            logger.info("ASX table created successfully")

            # Create clustering key for better query performance
            cursor.execute("""
                ALTER TABLE asx_stock_data CLUSTER BY (ticker, date)
            """)
            logger.info("Clustering key added for performance")

            cursor.close()

        except Exception as e:
            logger.error(f"Failed to create table: {e}")
            raise

    def create_s3_stage(self, s3_bucket: str, s3_key: str):
        """Create external stage for S3 data loading"""
        stage_name = 'asx_data_stage'

        create_stage_sql = f"""
        CREATE OR REPLACE STAGE {stage_name}
        URL = 's3://{s3_bucket}/{s3_key}'
        CREDENTIALS = (AWS_KEY_ID = '{os.getenv("AWS_ACCESS_KEY_ID")}'
                      AWS_SECRET_KEY = '{os.getenv("AWS_SECRET_ACCESS_KEY")}')
        FILE_FORMAT = (TYPE = PARQUET, COMPRESSION = SNAPPY)
        COMMENT = 'Stage for ASX data loading from S3'
        """

        try:
            cursor = self.connection.cursor()
            cursor.execute(create_stage_sql)
            logger.info(f"S3 stage {stage_name} created successfully")
            cursor.close()
            return stage_name

        except Exception as e:
            logger.error(f"Failed to create S3 stage: {e}")
            raise

    def load_data_from_s3(self, stage_name: str):
        """Load data from S3 stage into table"""
        load_sql = f"""
        COPY INTO asx_stock_data
        FROM @{stage_name}
        FILE_FORMAT = (TYPE = PARQUET)
        ON_ERROR = 'CONTINUE'
        """

        try:
            cursor = self.connection.cursor()
            cursor.execute(load_sql)

            # Get load statistics
            load_stats = cursor.fetchone()
            logger.info(f"Data loaded successfully. Rows inserted: {load_stats[0] if load_stats else 'Unknown'}")

            cursor.close()

        except Exception as e:
            logger.error(f"Failed to load data: {e}")
            raise

    def get_table_stats(self) -> dict:
        """Get statistics about the loaded data"""
        try:
            cursor = self.connection.cursor(DictCursor)

            # Get row count
            cursor.execute("SELECT COUNT(*) as total_rows FROM asx_stock_data")
            row_count = cursor.fetchone()['TOTAL_ROWS']

            # Get date range
            cursor.execute("""
                SELECT MIN(date) as start_date, MAX(date) as end_date
                FROM asx_stock_data
            """)
            date_range = cursor.fetchone()

            # Get ticker count
            cursor.execute("SELECT COUNT(DISTINCT ticker) as ticker_count FROM asx_stock_data")
            ticker_count = cursor.fetchone()['TICKER_COUNT']

            cursor.close()

            return {
                'total_rows': row_count,
                'date_range': date_range,
                'ticker_count': ticker_count
            }

        except Exception as e:
            logger.error(f"Failed to get table stats: {e}")
            return {}

    def run_sample_queries(self):
        """Run sample analytical queries to demonstrate capabilities"""
        sample_queries = [
            """
            SELECT ticker, company_name, COUNT(*) as data_points,
                   AVG(close_price) as avg_price, MAX(close_price) as max_price
            FROM asx_stock_data
            GROUP BY ticker, company_name
            ORDER BY avg_price DESC
            LIMIT 5
            """,
            """
            SELECT DATE_TRUNC('month', date) as month,
                   AVG(volume) as avg_volume,
                   COUNT(DISTINCT ticker) as active_stocks
            FROM asx_stock_data
            GROUP BY month
            ORDER BY month DESC
            LIMIT 6
            """
        ]

        try:
            cursor = self.connection.cursor(DictCursor)

            for i, query in enumerate(sample_queries, 1):
                logger.info(f"Running sample query {i}...")
                cursor.execute(query)
                results = cursor.fetchall()

                logger.info(f"Query {i} results: {len(results)} rows")
                if results:
                    logger.info(f"Sample result: {results[0]}")

            cursor.close()

        except Exception as e:
            logger.error(f"Failed to run sample queries: {e}")

def main():
    """Main loading function"""
    # Configuration - update these values
    SNOWFLAKE_CONFIG = {
        'account': os.getenv('SNOWFLAKE_ACCOUNT'),
        'user': os.getenv('SNOWFLAKE_USER'),
        'private_key_path': os.getenv('SNOWFLAKE_PRIVATE_KEY_PATH', 'snowflake-key.p8'),
        'warehouse': os.getenv('SNOWFLAKE_WAREHOUSE', 'COMPUTE_WH'),
        'database': 'ASX_ANALYTICS',
        'schema': 'PUBLIC'
    }

    S3_CONFIG = {
        'bucket': os.getenv('AWS_S3_BUCKET', 'your-asx-data-bucket'),
        'key': 'asx_data_20241201.parquet'  # Update with actual file
    }

    loader = SnowflakeLoader(**SNOWFLAKE_CONFIG)

    try:
        # Connect and setup
        loader.connect()
        loader.create_database_and_schema()
        loader.create_asx_table()

        # Load data from S3
        stage_name = loader.create_s3_stage(S3_CONFIG['bucket'], S3_CONFIG['key'])
        loader.load_data_from_s3(stage_name)

        # Verify and analyze
        stats = loader.get_table_stats()
        logger.info(f"Data loading complete. Stats: {stats}")

        loader.run_sample_queries()

        logger.info("✅ ASX data successfully loaded into Snowflake!")

    except Exception as e:
        logger.error(f"Data loading failed: {e}")
        return False

    finally:
        loader.disconnect()

    return True

if __name__ == "__main__":
    main()