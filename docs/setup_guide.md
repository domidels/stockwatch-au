# StockWatch AU - Setup Guide
## Cost-Optimized Australian Stock Market Analytics

### 🎯 **Goal**: Complete portfolio project under $5/month

---

## 📋 **Prerequisites**

### 1. **AWS Account** (Free Tier Available)
- S3 bucket in `ap-southeast-2` (Sydney) region
- IAM user with S3 permissions
- AWS CLI configured

### 2. **Snowflake Account** (30-day Free Trial)
- Trial account with $400 credit
- Standard edition sufficient

### 3. **Python Environment**
```bash
python --version  # 3.8+
pip --version     # Latest
```

---

## 🚀 **Step-by-Step Setup**

### **Step 1: Clone & Setup Project**
```bash
cd /home/soms/portfolio/stockwatch-au
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### **Step 2: Configure AWS S3**

#### Create S3 Bucket (Cost-Optimized)
```bash
# Create bucket in Sydney region
aws s3 mb s3://your-asx-data-bucket --region ap-southeast-2

# Enable versioning (recommended)
aws s3api put-bucket-versioning \
  --bucket your-asx-data-bucket \
  --versioning-configuration Status=Enabled

# Set lifecycle policy for cost optimization
aws s3api put-bucket-lifecycle-configuration \
  --bucket your-asx-data-bucket \
  --lifecycle-configuration file://s3-lifecycle-policy.json
```

#### S3 Lifecycle Policy (`s3-lifecycle-policy.json`)
```json
{
  "Rules": [
    {
      "ID": "ASX-Data-Lifecycle",
      "Status": "Enabled",
      "Prefix": "",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    }
  ]
}
```

### **Step 3: Configure Snowflake**

#### Login to Snowflake Web UI
1. Go to your Snowflake account
2. Create database: `ASX_ANALYTICS`
3. Create warehouse: `ASX_WH` (X-Small, Auto-suspend: 60s)

#### Run Schema Setup
Execute `snowflake/schemas/asx_schema.sql` in Snowflake worksheet.

### **Step 4: Environment Configuration**

#### Copy and Edit Configuration
```bash
cp .env.example .env
nano .env  # Edit with your credentials
```

#### Required Environment Variables
```bash
# AWS Settings
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=ap-southeast-2
S3_BUCKET_NAME=your-asx-data-bucket

# Snowflake Settings
SNOWFLAKE_ACCOUNT=your-account.snowflakecomputing.com
SNOWFLAKE_USER=your-username
SNOWFLAKE_PASSWORD=your-password
```

---

## 📊 **Data Pipeline Execution**

### **Step 1: Extract ASX Data**
```bash
cd /home/soms/portfolio/stockwatch-au
source venv/bin/activate
python scripts/extract_asx_data.py
```

### **Step 2: Upload to S3**
```bash
python scripts/upload_to_s3.py
```

### **Step 3: Load to Snowflake**
```bash
python scripts/snowflake_loader.py
```

### **Step 4: Run Analytics**
Execute queries from `snowflake/queries/asx_analytics.sql`

---

## 💰 **Cost Optimization Details**

### **S3 Costs** (Target: <$2/month)
- **STANDARD**: $0.023/GB
- **STANDARD_IA**: $0.0125/GB (46% savings)
- **GLACIER**: $0.0041/GB (82% savings)

### **Snowflake Costs** (Target: <$3/month)
- **X-Small Warehouse**: ~$2-3/month with auto-suspend
- **Storage**: ~$0.5/GB/month
- **Data Transfer**: Free within AWS region

### **Monitoring Costs**
```bash
# Check S3 costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-12-31 \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE

# Snowflake costs in web UI
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### S3 Access Denied
```bash
# Check IAM permissions
aws iam list-attached-user-policies --user-name your-user

# Required S3 permissions:
# s3:GetObject, s3:PutObject, s3:ListBucket
```

#### Snowflake Connection Failed
```bash
# Test connection
python -c "
import snowflake.connector
conn = snowflake.connector.connect(
    account='your-account',
    user='your-user',
    password='your-password'
)
print('Connection successful')
conn.close()
"
```

#### Python Dependencies
```bash
# Update pip
pip install --upgrade pip

# Install with verbose output
pip install -r requirements.txt -v
```

---

## 📈 **Portfolio Showcase**

### **Demo Queries for Interviews**

1. **Market Performance**: Top 10 performing stocks
2. **Risk Analysis**: Most volatile stocks
3. **Trend Analysis**: Moving averages and signals
4. **Portfolio Simulation**: Hypothetical portfolio returns

### **Architecture Explanation**
- **Data Source**: ASX via yfinance API
- **Storage**: S3 with lifecycle policies
- **Processing**: Snowflake for analytics
- **Cost Control**: Auto-suspend, storage classes

---

## 🎯 **Next Steps**

1. **Schedule Daily Updates** (cron job)
2. **Add More Analytics** (technical indicators)
3. **Create Dashboard** (Tableau/Streamlit)
4. **Add Alerts** (price movements)

**Total Setup Time**: ~2 hours
**Monthly Cost**: <$5
**Portfolio Value**: Enterprise-level data pipeline ✨