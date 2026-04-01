# StockWatch AU - Australian Stock Market Analytics

End-to-end data pipeline and analytics dashboard for ASX (Australian Stock Exchange) market data. Built with a serverless AWS architecture, Infrastructure as Code, and a React frontend.

Live dashboard: https://d3pydjy6229hps.cloudfront.net

---

## Architecture

```
EventBridge (daily, 4:30 PM Sydney, Mon-Fri)
      |
Lambda Ingestion
  |-- yfinance API  -->  DataFrame (in memory)
  |-- DataFrame     -->  S3 (Parquet, partitioned by date)
  |-- S3            -->  Snowflake (MERGE via external stage)
      |
Lambda API (triggered by API Gateway)
  |-- Snowflake queries  -->  JSON response
      |
React Dashboard (CloudFront + S3)
  |-- Market Overview page  (aggregated stats, top performers, volatility)
  |-- Stock Explorer page   (price history per ticker, line chart)
```

**Monthly cost: < $1**

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
|   |-- lambda.tf                 # API Lambda + API Gateway
|   |-- ingestion.tf              # Ingestion Lambda + EventBridge
|   |-- ecr.tf                    # ECR repositories
|   |-- terraform.tfvars.example  # Configuration template
|
|-- lambda/
|   |-- ingestion.py              # Daily ingestion pipeline
|   |-- handler.py                # API handler (4 endpoints)
|   |-- Dockerfile.ingestion      # Container image for ingestion
|   |-- Dockerfile.api            # Container image for API
|   |-- requirements-ingestion.txt
|   |-- requirements-api.txt
|
|-- frontend/
|   |-- src/
|   |   |-- App.jsx
|   |   |-- Dashboard.jsx         # Two-page dashboard (Overview + Stock Explorer)
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
|   |-- extract_asx_data.py       # Local data extraction (dev only)
|   |-- upload_to_s3.py           # Local S3 upload (dev only)
|   |-- snowflake_loader.py       # Local Snowflake loader (dev only)
|
|-- snowflake/
|   |-- schemas/asx_schema.sql
|   |-- queries/asx_analytics.sql
|
|-- .github/
|   |-- workflows/deploy.yml      # CI/CD pipeline
|
|-- .env                          # Local environment variables (not committed)
|-- requirements.txt
```

---

## Data Flow

### S3 Partitioning (Hive format, Athena-compatible)

```
s3://stockwatch-au-data-.../
  raw/
    asx/
      year=2026/
        month=03/
          day=31/
            asx_data.parquet
```

One file per trading day. Initial load creates ~130 files (6 months of history). Each subsequent daily run adds one file (~20 rows, ~2 KB).

### Snowflake Schema

```
ASX_ANALYTICS
  FINANCE
    asx_stock_data
      date, ticker, company_name
      open, high, low, close, volume
      dividends, stock_splits, loaded_at
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /data/summary | Market overview (stock count, date range, avg price, avg volume) |
| GET /data/top_performers | Top 10 stocks by average closing price |
| GET /data/volatility | Top 10 most volatile stocks (std dev of daily returns) |
| GET /data/history?ticker=CBA.AX | Full price history for a given ticker |

---

## Deployment

### Prerequisites

- AWS account with CLI configured
- Snowflake account
- Terraform >= 1.0
- Docker
- Node.js 20

### Initial Setup

**1. Configure Terraform**

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Fill in: snowflake_account, snowflake_user, snowflake_private_key
```

**2. Generate Snowflake RSA key pair**

```bash
openssl genrsa -out snowflake-key.p8 2048
openssl rsa -in snowflake-key.p8 -pubout -out snowflake-key.pub
```

Register the public key in Snowflake:
```sql
ALTER USER your_user SET RSA_PUBLIC_KEY='<contents of snowflake-key.pub without BEGIN/END lines>';
```

**3. Deploy infrastructure**

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

**4. Store S3 credentials for Snowflake**

Terraform automatically stores the dedicated `snowflake-s3-reader` IAM user credentials in Secrets Manager. No manual step required.

**5. Run initial data load**

The ingestion Lambda auto-detects an empty table and loads 6 months of history on first run:

```bash
aws lambda invoke \
  --function-name stockwatch-au-ingestion \
  /tmp/result.json && cat /tmp/result.json
```

Subsequent daily runs are triggered automatically by EventBridge.

**6. Deploy frontend**

```bash
cd frontend
cp .env.local.example .env.local
# Set REACT_APP_API_URL to terraform output api_gateway_endpoint
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

Every push to `main` automatically:
1. Builds and pushes Docker images to ECR
2. Updates Lambda functions
3. Builds and deploys the React frontend to S3
4. Invalidates CloudFront cache

Required GitHub secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `API_GATEWAY_URL`

---

## Security

- Lambda authenticates to Snowflake via RSA key pair (no password)
- Snowflake credentials stored in AWS Secrets Manager
- Dedicated IAM user for Snowflake S3 access (read-only, scoped to `raw/asx/*`)
- S3 buckets are private, frontend served via CloudFront with OAI
- No credentials committed to git (`terraform.tfvars`, `.env`, `*.tfstate` in `.gitignore`)

---

## Troubleshooting

**Lambda ingestion fails (Snowflake auth)**
```bash
aws secretsmanager get-secret-value \
  --secret-id stockwatch-au-snowflake-credentials \
  --query SecretString --output text
```
Verify that `private_key` contains the full PEM including `-----BEGIN/END RSA PRIVATE KEY-----`.

**Lambda ingestion fails (S3 access)**
```bash
aws secretsmanager get-secret-value \
  --secret-id stockwatch-au-s3-credentials \
  --query SecretString --output text
```

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

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Data source | yfinance (Yahoo Finance / ASX) |
| Storage | AWS S3 (Parquet + Snappy compression) |
| Data warehouse | Snowflake (ASX_ANALYTICS.FINANCE) |
| Compute | AWS Lambda (Docker container images) |
| API | AWS API Gateway |
| Frontend | React, Recharts, Tailwind CSS |
| CDN | AWS CloudFront |
| Infrastructure | Terraform |
| Container registry | AWS ECR |
| CI/CD | GitHub Actions |
| Auth | RSA key pair (Snowflake), IAM roles (AWS) |
