# Terraform Deployment Guide - StockWatch AU

## 🔐 Security First - No Credentials in Git!

All sensitive files are in `.gitignore`:
- `terraform.tfvars` (your credentials)
- `*.tfstate` (Terraform state)
- `.terraform/` (providers)

---

## 📋 Prerequisites

1. **AWS Account** with permissions for:
   - S3 buckets
   - Lambda functions
   - API Gateway
   - CloudFront
   - IAM roles
   - Secrets Manager

2. **Terraform** installed (v1.0+):
   ```bash
   terraform --version
   ```

3. **AWS CLI** configured:
   ```bash
   aws configure
   # Enter your existing AWS credentials
   ```

---

## 🚀 Deployment Steps

### Step 1: Prepare Configuration

```bash
cd terraform

# Copy template to working file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

**Required values in `terraform.tfvars`:**
- `s3_bucket_name`: Your S3 bucket (created earlier)
- `snowflake_account`: Your Snowflake account ID
- `snowflake_user`: Your Snowflake username
- `snowflake_password`: Your Snowflake password

### Step 2: Initialize Terraform

```bash
terraform init
```

This downloads:
- AWS provider
- Required plugins
- Initializes `.terraform/` (auto-ignored)

### Step 3: Validate Configuration

```bash
terraform validate
```

Checks syntax and logic errors.

### Step 4: Plan Deployment

```bash
terraform plan -out=tfplan
```

This shows **exactly** what will be created:
- S3 buckets
- CloudFront distribution
- Lambda function
- API Gateway
- IAM roles/policies

**Review carefully** before applying!

### Step 5: Apply Configuration

```bash
terraform apply tfplan
```

This creates all resources on AWS.

**⏱️ Takes ~3-5 minutes**

### Step 6: Get Outputs

```bash
terraform output
```

**Important outputs:**
- `api_gateway_endpoint`: Your API URL
- `cloudfront_domain_name`: Frontend URL
- `script_user_access_key`: For `aws configure`
- `script_user_secret_key`: For `aws configure`

### Step 7: Save Sensitive Outputs

```bash
# Save these securely (not in git!)
terraform output -raw script_user_access_key > ~/.aws/stockwatch_key.txt
terraform output -raw script_user_secret_key > ~/.aws/stockwatch_secret.txt

# Protect files
chmod 600 ~/.aws/stockwatch_*.txt
```

---

## 🔒 Configure Credentials

### Local Machine (for your scripts)

```bash
# Get credentials from Terraform output
terraform output script_user_access_key
terraform output script_user_secret_key

# Configure AWS CLI for your user
aws configure
# Use the credentials above
```

### Snowflake Secret in AWS

```bash
# Terraform created the secret, but you need to populate it
SECRET_NAME=$(terraform output -raw snowflake_secret_name)

aws secretsmanager create-secret \
  --name ${SECRET_NAME}-s3-creds \
  --secret-string '{"access_key":"YOUR_IAM_KEY","secret_key":"YOUR_IAM_SECRET"}'
```

---

## 📦 Deploy Frontend

```bash
# Build React app
cd ../frontend
npm install
npm run build

# Deploy to S3
FRONTEND_BUCKET=$(cd ../terraform && terraform output -raw s3_frontend_bucket_name)

aws s3 sync build s3://${FRONTEND_BUCKET}/ --delete

# Invalidate CloudFront cache
DIST_ID=$(cd ../terraform && terraform output -raw cloudfront_distribution_id)

aws cloudfront create-invalidation \
  --distribution-id ${DIST_ID} \
  --paths "/*"
```

**Frontend is now live!** 🎉

---

## 🔄 Update Frontend

After code changes:

```bash
cd frontend
npm run build

aws s3 sync build s3://${FRONTEND_BUCKET}/ --delete
aws cloudfront create-invalidation --distribution-id ${DIST_ID} --paths "/*"
```

---

## 💰 Cost Monitoring

Check AWS costs:

```bash
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-12-31 \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

Expected costs:
- **S3**: $1-2/month (with lifecycle policy)
- **Lambda**: ~$0.20/month (free tier covers this)
- **API Gateway**: Free for <1M requests
- **CloudFront**: ~$0.085 per GB
- **Total**: $2-4/month ✅

---

## 🗑️ Cleanup (If Needed)

**Warning: This deletes everything!**

```bash
# See what will be destroyed
terraform plan -destroy

# Destroy resources
terraform destroy
```

---

## 🐛 Troubleshooting

### Authentication Error
```bash
# Check AWS credentials
aws sts get-caller-identity

# If error, reconfigure
aws configure
```

### Terraform State Error
```bash
# Remove local state (careful!)
rm -rf .terraform
terraform init
```

### API Not Working
```bash
# Check Lambda logs
aws logs tail /aws/lambda/stockwatch-au-api-handler --follow

# Test API directly
curl https://your-api-gateway-url.execute-api.ap-southeast-2.amazonaws.com/dev/data/summary
```

### CloudFront Not Updating
```bash
# Invalidate all files
aws cloudfront create-invalidation \
  --distribution-id $(terraform output cloudfront_distribution_id) \
  --paths "/*"
```

---

## 📚 Resources

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [Snowflake External Stages](https://docs.snowflake.com/en/user-guide/data-load-s3-config-storage-integration)

---

**Architecture is production-ready! 🚀**
