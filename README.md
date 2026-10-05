# StockWatch AU - Australian Stock Market Analytics

End-to-end data pipeline and analytics dashboard for ASX (Australian Stock Exchange) market data. Built with a serverless AWS architecture, Infrastructure as Code, and a React frontend.

---

## Architecture

```
EventBridge (daily, 4:30 PM Sydney, Mon-Fri)
      |
Lambda Ingestion
  |-- yfinance API  -->  DataFrame (in memory)
  |-- DataFrame     -->  S3 daily partitions (Parquet, Hive layout)
  |-- DataFrame     -->  S3 consolidated file (merged + de-duplicated)
  |-- Full history  -->  S3 api/*.json (every dashboard payload, pre-computed)
      |
CloudFront /api/*  -->  static JSON (gzip, edge-cached) — what the dashboard reads
      |
Lambda API (triggered by API Gateway, ad-hoc queries only)
  |-- S3 consolidated Parquet  -->  pandas / scikit-learn  -->  JSON response
  |-- In-memory cache (5 min TTL, reused across warm invocations)
      |
React Dashboard (CloudFront + S3, custom domain via ACM)
  |-- Market Overview      (aggregated stats, top performers, volatility)
  |-- Stock Explorer       (price history, monthly/weekly bar chart)
  |-- Monthly Heatmap      (month-by-month returns across all tickers)
  |-- Correlation          (rolling cross-correlation between two stocks)
  |-- Stock Clusters (PCA) (dimensionality reduction of 12-month return profiles)
```

> **Why no data warehouse?** The project originally loaded data into Snowflake. With ~20 tickers of daily OHLCV data, the full history fits in a single Parquet file of a few MB, so Snowflake was replaced by S3 + pandas: lower cost, fewer credentials to manage, and a simpler deployment.

---

## Project Structure

```
stockwatch-au/
|-- terraform/                    # Infrastructure as Code
|   |-- versions.tf               # Provider versions
|   |-- variables.tf              # Input variables
|   |-- outputs.tf                # Output values
|   |-- iam.tf                    # IAM roles, users, policies
|   |-- s3.tf                     # S3 buckets + CloudFront
|   |-- acm.tf                    # ACM certificate for the custom domain (us-east-1)
|   |-- lambda.tf                 # API Lambda + API Gateway (+ throttling)
|   |-- ingestion.tf              # Ingestion Lambda + EventBridge
|   |-- ecr.tf                    # ECR repositories
|   |-- terraform.tfvars          # Configuration (not committed)
|
|-- lambda/
|   |-- ingestion.py              # Daily ingestion pipeline
|   |-- handler.py                # API handler (6 endpoints, pandas + scikit-learn)
|   |-- Dockerfile.ingestion      # Container image for ingestion
|   |-- Dockerfile.api            # Container image for API
|   |-- requirements-ingestion.txt
|   |-- requirements-api.txt
|
|-- frontend/
|   |-- src/
|   |   |-- App.jsx
|   |   |-- Dashboard.jsx         # Multi-page dashboard (Overview, Explorer, Heatmap, Correlation, PCA)
|   |   |-- Dashboard.css         # Mobile responsive layout (hamburger menu, table scroll)
|   |   |-- api.js                # API client
|   |   |-- index.js
|   |   |-- index.css
|   |-- public/
|   |   |-- index.html
|   |-- package.json
|
|-- scripts/
|   |-- build_lambda.sh           # Build and deploy Lambda Docker images
|   |-- deploy_frontend.sh        # Build and deploy React frontend to S3 + CloudFront
|   |-- backfill_local.py         # One-off backfill of full history to S3 (run locally)
|   |-- extract_asx_data.py       # Local data extraction (dev only)
|   |-- upload_to_s3.py           # Local S3 upload (dev only)
|
|-- snowflake/                    # Legacy SQL from the Snowflake version (no longer used)
|
|-- docs/                         # Setup and Terraform deployment guides
|
|-- .github/
|   |-- workflows/deploy.yml      # CI/CD pipeline (lint + deploy)
|
|-- .env                          # Local environment variables (not committed)
|-- requirements.txt
```

---

## Data Flow

### S3 Layout

```
s3://stockwatch-au-data-.../
  raw/
    asx/
      year=2026/                  # Daily partitions (Hive format, Athena-compatible)
        month=03/
          day=31/
            asx_data.parquet
      consolidated/
        asx_all.parquet           # Full history in one file — read by the API
  api/                            # Pre-computed dashboard JSON, served by CloudFront at /api/
    summary.json
    overview.json                 # Top performers + volatility for every period (1M … All)
    heatmap.json
    pca.json
    history/<TICKER>.json         # Full price history, filtered by period in the browser
```

- **Static API**: after each run the ingestion Lambda regenerates `api/*.json` (`lambda/analytics.py`, shared with the API handler). The dashboard loads these files from CloudFront, so a page load never waits on a Lambda cold start. To rebuild them without fetching new data: `python scripts/build_static_api.py`, or invoke the ingestion Lambda with `{"rebuild_api": true}`.

- **Daily partitions**: one file per trading day (~20 rows, ~2 KB). Kept as the raw, append-only record.
- **Consolidated file**: every ingestion run merges new rows into `asx_all.parquet` (de-duplicated on `date` + `ticker`). The API reads this single file (~200 ms) instead of hundreds of partitions, which keeps responses well under the API Gateway 29 s timeout.

### Ingestion modes

| Situation | Period fetched | Output |
|-----------|----------------|--------|
| S3 empty (first run) | 6 months | One partition per trading day + consolidated file |
| Daily run (EventBridge) | Last 2 days | One partition for the run date + consolidated merge |
| Forced (`{"period": "3y"}` in the event) | As requested | One partition per trading day + consolidated merge |
| Local backfill (`scripts/backfill_local.py`) | Max available | Missing partitions only; consolidated file created if absent |

### Data schema

```
date, ticker, company_name,
open, high, low, close, volume,
dividends, stock_splits
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /data/summary | Market overview (stock count, date range, avg price, avg volume) |
| GET /data/top_performers?days=N | Total return and volatility per ticker over N days |
| GET /data/volatility?days=N | Daily return standard deviation per ticker over N days |
| GET /data/history?ticker=CBA.AX&days=N | OHLCV price history for a given ticker |
| GET /data/heatmap | Monthly returns per ticker (used by Heatmap page) |
| GET /data/pca | PCA on last 12 months of returns — scores, correlation circle, scree data (scikit-learn, computed server-side) |

---

## Deployment

### Prerequisites

- AWS account with CLI configured
- Terraform >= 1.0
- Docker
- Node.js 20 (required to build the React frontend)

### Initial Setup

**1. Configure Terraform**

Create `terraform/terraform.tfvars`:

```hcl
s3_bucket_name = "your-data-bucket-name"
domain_name    = "your-domain.com"
environment    = "dev"
lambda_timeout = 300
lambda_memory  = 256
```

**2. Deploy infrastructure**

```bash
# Create ECR repositories first
terraform apply -target=aws_ecr_repository.ingestion \
                -target=aws_ecr_repository.api_handler

# Build and push Docker images
cd ..
sg docker -c "./scripts/build_lambda.sh all"

# Deploy remaining infrastructure
cd terraform
terraform apply
```

**3. Validate the custom domain certificate**

`terraform apply` blocks on ACM DNS validation. In another terminal:

```bash
terraform output acm_validation_records
```

Add each CNAME record in Cloudflare (DNS > Records). Validation usually completes within 5 minutes, then point the domain at `terraform output cloudfront_domain_name`.

**4. Run initial data load**

The ingestion Lambda auto-detects an empty bucket and loads 6 months of history on first run:

```bash
aws lambda invoke \
  --function-name stockwatch-au-ingestion \
  /tmp/result.json && cat /tmp/result.json
```

To load the full available history instead, run the local backfill (requires `S3_BUCKET` in `.env`, uses your AWS CLI credentials):

```bash
python scripts/backfill_local.py
```

Subsequent daily runs are triggered automatically by EventBridge.

**5. Deploy frontend**

Set in `.env`:

```bash
FRONTEND_S3_BUCKET=<terraform output s3_frontend_bucket_name>
CLOUDFRONT_DISTRIBUTION_ID=<terraform output cloudfront_distribution_id>
```

Then build with `REACT_APP_API_URL` set to `terraform output api_gateway_endpoint`:

```bash
./scripts/deploy_frontend.sh
```

### Updating Lambda functions

After modifying `lambda/handler.py` or `lambda/ingestion.py`:

```bash
sg docker -c "./scripts/build_lambda.sh api"       # API only
sg docker -c "./scripts/build_lambda.sh ingestion" # Ingestion only
sg docker -c "./scripts/build_lambda.sh all"       # Both
```

### Updating the frontend

After modifying any file in `frontend/src/`:

```bash
./scripts/deploy_frontend.sh
```

### CI/CD (GitHub Actions)

Every push to `main` (or manual `workflow_dispatch`) automatically:
1. Lints Python (`ruff check lambda/`) and builds the React app
2. Builds and pushes Docker images to ECR
3. Updates Lambda functions
4. Builds and deploys the React frontend to S3
5. Invalidates CloudFront cache

Required GitHub secrets (Settings > Secrets and variables > Actions):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `API_GATEWAY_URL`
- `FRONTEND_S3_BUCKET`
- `CLOUDFRONT_DISTRIBUTION_ID`

---

## Security

- Lambdas use an IAM role (no stored credentials); ingestion can only write under `raw/*`
- S3 buckets are private, frontend served via CloudFront with OAI over HTTPS (ACM certificate)
- API Gateway throttling: 10 req/s sustained, 20 burst (bots additionally filtered by Cloudflare)
- No credentials committed to git (`terraform.tfvars`, `.env`, `*.tfstate` in `.gitignore`)

---

## Troubleshooting

**Dashboard shows no data**

Check that the consolidated file exists:
```bash
aws s3 ls s3://<data-bucket>/raw/asx/consolidated/
```
If it is missing, run `python scripts/backfill_local.py` or invoke the ingestion Lambda. Note the API caches data for 5 minutes per warm Lambda instance.

**View Lambda logs**
```bash
aws logs tail /aws/lambda/stockwatch-au-ingestion --follow
aws logs tail /aws/lambda/stockwatch-au-api-handler --follow
```

**Terraform authentication error**
```bash
aws sts get-caller-identity
```

**CloudFront not updated after frontend deploy**
```bash
aws cloudfront create-invalidation \
  --distribution-id <ID> --paths "/*"
```

---

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).

You are free to share and adapt this work for non-commercial purposes, provided appropriate credit is given. Commercial use of any kind is strictly prohibited without prior written permission from the author.

Full license: https://creativecommons.org/licenses/by-nc/4.0/

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Data source | yfinance (Yahoo Finance / ASX) |
| Storage | AWS S3 (Parquet + Snappy compression) |
| Analytics | pandas, NumPy, scikit-learn (PCA) |
| Compute | AWS Lambda (Docker container images) |
| API | AWS API Gateway |
| Frontend | React 18, Recharts |
| CDN | AWS CloudFront + ACM (custom domain, DNS on Cloudflare) |
| Infrastructure | Terraform |
| Container registry | AWS ECR |
| CI/CD | GitHub Actions |
| Auth | IAM roles (AWS) |
