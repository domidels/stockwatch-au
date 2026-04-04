#!/usr/bin/env python3
"""
ASX Data Extraction Script
Extracts stock data from Australian Stock Exchange using yfinance
Optimized for minimal S3 costs with compression and efficient data formats
"""

import logging
from datetime import datetime
from typing import List
import pandas as pd
import yfinance as yf
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ASXDataExtractor:
    """Extract ASX stock data with cost optimization in mind"""

    # Top 50 ASX stocks by market cap (as of 2024)
    TOP_ASX_STOCKS = [
        'CBA.AX',   # Commonwealth Bank
        'BHP.AX',   # BHP Group
        'CSL.AX',   # CSL Limited
        'MQG.AX',   # Macquarie Group
        'WBC.AX',   # Westpac
        'NAB.AX',   # National Australia Bank
        'RIO.AX',   # Rio Tinto
        'ANZ.AX',   # ANZ Bank
        'WES.AX',   # Wesfarmers
        'GMG.AX',   # Goodman Group
        'TLS.AX',   # Telstra
        'COL.AX',   # Coles Group
        'ALL.AX',   # Aristocrat Leisure
        'REA.AX',   # REA Group
        'STO.AX',   # Santos
        'XRO.AX',   # Xero
        'ASX.AX',   # ASX Limited
        'WOW.AX',   # Woolworths
        'FMG.AX',   # Fortescue Metals Group
        'SHL.AX',   # Sonic Healthcare
        'COH.AX',   # Cochlear
        'BEN.AX',   # Bendigo and Adelaide Bank
        'BOQ.AX',   # Bank of Queensland
        'SUN.AX',   # Suncorp Group
        'IAG.AX',   # Insurance Australia Group
        'QAN.AX',   # Qantas Airways
        'TCL.AX',   # Transurban
        'CPU.AX',   # Computershare
        'JHX.AX',   # James Hardie Industries
        'VCX.AX',   # Vicinity Centres
        'ORG.AX',   # Origin Energy
        'APA.AX',   # APA Group
        'S32.AX',   # South32
        'DXS.AX',   # Dexus
        'SCG.AX',   # Suncorp Group
        'ALU.AX',   # Altium
        'CGF.AX',   # Challenger
        'A2M.AX',   # The a2 Milk Company
        'SOL.AX',   # Washington H. Soul Pattinson
        'MGR.AX',   # Mirvac Group
        'GPT.AX',   # GPT Group
        'CAR.AX',   # Carsales.com
        'SGR.AX',   # The Star Entertainment Group
        'ILU.AX',   # Iluka Resources
        'MIN.AX',   # Mineral Resources
        'BXB.AX',   # Brambles
        'WTC.AX',   # Wisetech Global
        'NST.AX',   # Northern Star Resources
        'EVN.AX',   # EVN
        'AMC.AX',   # Amcor
        'RHC.AX',   # Ramsay Health Care
        'HVN.AX',   # Harvey Norman
        'CHC.AX'    # Charter Hall Group
    ]

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.extraction_date = datetime.now().strftime('%Y%m%d')

    def extract_stock_data(self, ticker: str, period: str = "1y") -> pd.DataFrame:
        """
        Extract stock data for a single ticker
        Optimized for minimal API calls and data storage
        """
        try:
            logger.info(f"Extracting data for {ticker}")
            stock = yf.Ticker(ticker)

            # Get historical data
            hist = stock.history(period=period, interval="1d")

            if hist.empty:
                logger.warning(f"No data found for {ticker}")
                return pd.DataFrame()

            # Add metadata
            hist['ticker'] = ticker
            hist['extraction_date'] = self.extraction_date
            hist['company_name'] = stock.info.get('longName', 'Unknown')

            # Reset index to make date a column
            hist = hist.reset_index()

            # Rename columns for consistency
            hist = hist.rename(columns={
                'Date': 'date',
                'Open': 'open',
                'High': 'high',
                'Low': 'low',
                'Close': 'close',
                'Volume': 'volume',
                'Dividends': 'dividends',
                'Stock Splits': 'stock_splits'
            })

            # Convert date to string for Parquet compatibility
            hist['date'] = hist['date'].dt.strftime('%Y-%m-%d')

            return hist

        except Exception as e:
            logger.error(f"Error extracting data for {ticker}: {str(e)}")
            return pd.DataFrame()

    def extract_all_stocks(self, stocks: List[str] = None, period: str = "1y") -> pd.DataFrame:
        """
        Extract data for all specified stocks
        Returns combined DataFrame optimized for storage
        """
        if stocks is None:
            stocks = self.TOP_ASX_STOCKS

        all_data = []

        for ticker in stocks:
            df = self.extract_stock_data(ticker, period)
            if not df.empty:
                all_data.append(df)

        if not all_data:
            logger.error("No data extracted for any stocks")
            return pd.DataFrame()

        # Combine all data
        combined_df = pd.concat(all_data, ignore_index=True)

        # Sort by ticker and date for efficient querying
        combined_df = combined_df.sort_values(['ticker', 'date'])

        # Optimize data types for storage
        combined_df = self._optimize_dtypes(combined_df)

        logger.info(f"Extracted data for {len(combined_df['ticker'].unique())} stocks")
        return combined_df

    def _optimize_dtypes(self, df: pd.DataFrame) -> pd.DataFrame:
        """Optimize data types for efficient storage and querying"""
        # Convert numeric columns to appropriate types
        numeric_cols = ['open', 'high', 'low', 'close', 'volume']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], downcast='float')

        # Convert volume to integer
        if 'volume' in df.columns:
            df['volume'] = df['volume'].astype('Int64')

        # Category for repeated strings
        if 'ticker' in df.columns:
            df['ticker'] = df['ticker'].astype('category')

        return df

    def save_to_parquet(self, df: pd.DataFrame, filename: str = None) -> str:
        """
        Save DataFrame to compressed Parquet format
        Optimized for S3 storage costs
        """
        if filename is None:
            filename = f"asx_data_{self.extraction_date}.parquet"

        filepath = self.data_dir / filename

        # Save with compression for minimal storage costs
        df.to_parquet(
            filepath,
            compression='snappy',  # Good compression ratio + fast
            index=False
        )

        file_size = filepath.stat().st_size / (1024 * 1024)  # MB
        logger.info(f"Saved {len(df)} records to {filepath} ({file_size:.2f} MB)")

        return str(filepath)

def main():
    """Main extraction function"""
    extractor = ASXDataExtractor()

    # Extract data for top 20 stocks to keep costs low
    top_20_stocks = extractor.TOP_ASX_STOCKS[:20]

    logger.info(f"Starting extraction for {len(top_20_stocks)} ASX stocks")

    # Extract 6 months of data to minimize storage
    df = extractor.extract_all_stocks(stocks=top_20_stocks, period="6mo")

    if not df.empty:
        filepath = extractor.save_to_parquet(df)
        logger.info(f"Extraction complete. File saved to: {filepath}")
        return filepath
    else:sudo apt-get update -qq && sudo apt-get install -y docker.io && sudo systemctl start docker && sudo usermod -aG docker $USER
        logger.error("Extraction failed - no data retrieved")
        return None

if __name__ == "__main__":
    main()