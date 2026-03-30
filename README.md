# StockWatch AU - Australian Stock Market Analytics Portfolio

**Enterprise-grade data pipeline + Dashboard. Cost: <$5/month.**

## 🎯 Quick Overview

```
ASX Data
   ↓
Python ETL (yfinance)
   ↓
S3 (Data Lake) ← $1-2/month
   ↓
Snowflake (Analytics) ← Trial/Cheap
   ↓
Lambda API ← Free tier
   ↓
React Dashboard + CloudFront ← $0-1/month
```

**Total Monthly Cost: $2-5** ✅

---

## 📁 Project Structure

```
stockwatch-au/
├── terraform/                    # Infrastructure as Code
│   ├── main.tf                  # Main config
│   ├── variables.tf             # Variables
│   ├── outputs.tf               # Outputs
│   ├── iam.tf                   # Security (roles/policies)
│   ├── s3.tf                    # S3 + CloudFront
│   ├── lambda.tf                # Lambda + API Gateway
│   ├── versions.tf              # Provider versions
│   └── terraform.tfvars.example # Template (copy & fill)
│
├── lambda/                      # Backend
│   ├── handler.py              # API endpoints (Snowflake queries)
│   └── handler.zip             # Packaged for AWS
│
├── frontend/                    # Dashboard
│   ├── src/
│   │   ├── App.jsx             # Main component
│   │   ├── Dashboard.jsx       # Charts + tables
│   │   ├── api.js              # Lambda API client
│   │   ├── index.js            # Entry point
│   │   └── index.css           # Tailwind styles
│   ├── public/
│   │   └── index.html          # HTML template
│   └── package.json            # Dependencies
│
├── scripts/                     # Python ETL
│   ├── extract_asx_data.py     # Yfinance extraction
│   ├── upload_to_s3.py         # S3 upload (cost optimized)
│   └── snowflake_loader.py     # Load to Snowflake
│
├── snowflake/                   # Analytics SQL
│   ├── schemas/asx_schema.sql  # Database schema
│   └── queries/asx_analytics.sql # Advanced queries
│
├── docs/                        # Documentation
│   ├── setup_guide.md          # Initial setup
│   └── terraform_deployment.md # Terraform guide
│
├── .env.example                 # Env template
├── requirements.txt             # Python dependencies
└── .gitignore                   # Security (no credentials!)
```

---

## 🚀 Getting Started

### **Phase 1: Local Development (30 mins)**

```bash
# 1. Clone & setup
cd /home/soms/portfolio/stockwatch-au
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2. Extract sample data
python scripts/extract_asx_data.py

# 3. Test locally
python demo.py
```

### **Phase 2: AWS Infrastructure (30 mins)**

```bash
# 1. Prepare Terraform
cd terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Fill in your values

# 2. Deploy
terraform init
terraform plan
terraform apply

# 3. Save credentials
terraform output script_user_access_key
terraform output script_user_secret_key
```

**See:** [Terraform Deployment Guide](docs/terraform_deployment.md)

### **Phase 3: Configure & Deploy (20 mins)**

```bash
# 1. Upload data to S3
aws configure  # Use credentials from terraform output
python scripts/upload_to_s3.py

# 2. Load to Snowflake
python scripts/snowflake_loader.py

# 3. Deploy frontend
cd frontend
npm install
npm run build
aws s3 sync build s3://stockwatch-au-data-frontend-*/ --delete

# 4. Visit dashboard
# Open CloudFront URL from terraform output
```

---

## 💡 Architecture Highlights

### **Security** 🔒
- ✅ IAM Roles (no exposed credentials in Lambda)
- ✅ Secrets Manager (Snowflake creds encrypted)
- ✅ S3 bucket policies (private + CloudFront)
- ✅ .gitignore enforced (no tfvars, .tfstate)

### **Cost Optimization** 💰
- ✅ S3 Lifecycle: STANDARD → IA → GLACIER → DEEP_ARCHIVE
- ✅ Lambda: ~$0.20/month (free tier)
- ✅ API Gateway: 1M free requests/month
- ✅ CloudFront: ~$0.085/GB (global CDN)
- ✅ Snowflake: Trial $400 credits (6+ months)

### **Scalability** 📈
- ✅ Terraform IaC (reproducible)
- ✅ Lambda auto-scales
- ✅ CloudFront global edge locations
- ✅ Snowflake serverless scaling

### **Data Quality** 📊
- ✅ Parquet compression (fast + cheap)
- ✅ Snowflake clustering (optimal queries)
- ✅ ASX data validation
- ✅ Error handling & logging

---

## 🔄 Data Flow

### **Daily Pipeline**

```
1. Extract (Python + yfinance)
   └─ Top 20 ASX stocks, 6 months history

2. Transform (Pandas)
   └─ Compress to Parquet + Snappy

3. Upload (boto3)
   └─ S3 Standard → Auto-transition to IA/Glacier

4. Load (Snowflake)
   └─ Staged load from S3 (no transfer costs!)

5. Query (Lambda + API Gateway)
   └─ Top performers, volatility, trends

6. Visualize (React + Recharts)
   └─ Dashboard via CloudFront
```

### **Queries Available**

- **Market Summary**: Total stocks, data range, avg prices
- **Top Performers**: Highest avg prices, volatility
- **Volatility Analysis**: Standard deviation, worst/best days
- **Trend Analysis**: Moving averages (5-day, 20-day)
- **Portfolio Simulation**: Hypothetical returns

---

## 📚 Documentation

1. **[Setup Guide](docs/setup_guide.md)** - Initial configuration
2. **[Terraform Deployment](docs/terraform_deployment.md)** - AWS infrastructure
3. **Code Comments** - Inline documentation in all files

---

## 🎓 Portfolio Value

This project demonstrates:

✅ **Data Engineering**
- ETL pipeline design
- Data warehousing (Snowflake)
- S3 data lakes
- Cost optimization

✅ **Cloud Architecture**
- Infrastructure as Code (Terraform)
- Serverless computing (Lambda)
- API Gateway design
- CDN distribution (CloudFront)

✅ **Security**
- IAM best practices
- Secrets management
- Encryption at rest/transit

✅ **Full-Stack Development**
- Python backend (data pipeline)
- React frontend (dashboard)
- REST API (Lambda)
- DevOps (Terraform)

---

## 💻 Technology Stack

- **Languages**: Python, JavaScript (React), SQL, HCL (Terraform)
- **Data**: Snowflake, AWS S3, Parquet, yfinance
- **Compute**: AWS Lambda, API Gateway
- **Frontend**: React, Recharts, Tailwind CSS
- **Infrastructure**: Terraform, AWS
- **Monitoring**: CloudWatch Logs, AWS Cost Explorer

---

## 🛠️ Maintenance

### **Weekly**
- Monitor CloudWatch logs
- Check AWS cost explorer
- Validate data freshness

### **Monthly**
- Review Snowflake queries
- Optimize Lambda memory
- Update dependencies

### **Quarterly**
- Extend data retention (if needed)
- Review lifecycle policies
- Scale infrastructure

---

## ⚠️ Important Notes

1. **Credentials**: Never commit `.env`, `terraform.tfvars`, `.tfstate`
2. **AWS**: Monitor costs via Cost Explorer
3. **Snowflake**: Track credit usage (trial: $400)
4. **Data**: Parquet + Snappy = optimal compression

---

## 🚨 Troubleshooting

**Python import errors?**
```bash
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

**Terraform authentication failed?**
```bash
aws sts get-caller-identity  # Check AWS access
aws configure  # Reconfigure credentials
```

**Lambda API returns 500?**
```bash
aws logs tail /aws/lambda/stockwatch-au-api-handler --follow
# Check Snowflake credentials in Secrets Manager
```

**Frontend not loading?**
```bash
# Clear CloudFront cache
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

---

## 📞 Support

- **AWS Docs**: https://docs.aws.amazon.com
- **Snowflake Docs**: https://docs.snowflake.com
- **Terraform Docs**: https://www.terraform.io/docs
- **React Docs**: https://react.dev

---

## 📄 License

Portfolio project - Free to use and modify

---

**🎉 Ready to impress recruiters!**

Start with Phase 1, then move to Phase 2 & 3.
