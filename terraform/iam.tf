# =====================================================
# SECURITY: Store sensitive data in AWS Secrets Manager
# =====================================================

resource "aws_secretsmanager_secret" "snowflake_credentials" {
  name                    = "${var.project_name}-snowflake-credentials"
  description             = "Snowflake connection credentials for Lambda"
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = "${var.project_name}-snowflake-secret"
  })
}

resource "aws_secretsmanager_secret_version" "snowflake_credentials" {
  secret_id = aws_secretsmanager_secret.snowflake_credentials.id
  secret_string = jsonencode({
    account     = var.snowflake_account
    user        = var.snowflake_user
    private_key = var.snowflake_private_key
    database    = var.snowflake_database
    schema      = var.snowflake_schema
    warehouse   = var.snowflake_warehouse
  })
}

resource "aws_secretsmanager_secret" "s3_credentials" {
  name                    = "${var.project_name}-s3-credentials"
  description             = "AWS S3 credentials for Snowflake and external services"
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = "${var.project_name}-s3-secret"
  })
}

# Note: Create this secret with your IAM credentials via console or after terraform apply
# aws secretsmanager create-secret --name stockwatch-au-s3-credentials --secret-string '{"access_key":"XXX","secret_key":"YYY"}'

# =====================================================
# IAM ROLE FOR LAMBDA
# =====================================================

resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# =====================================================
# LAMBDA PERMISSIONS
# =====================================================

# Permission: Read from S3
resource "aws_iam_role_policy" "lambda_s3_read" {
  name = "${var.project_name}-lambda-s3-read"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.s3_bucket_name}",
          "arn:aws:s3:::${var.s3_bucket_name}/*"
        ]
      }
    ]
  })
}

# Permission: Access Secrets Manager
resource "aws_iam_role_policy" "lambda_secrets_manager" {
  name = "${var.project_name}-lambda-secrets-manager"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.snowflake_credentials.arn,
          aws_secretsmanager_secret.s3_credentials.arn
        ]
      }
    ]
  })
}

# =====================================================
# IAM ROLE FOR YOUR LOCAL SCRIPTS
# =====================================================

resource "aws_iam_user" "script_user" {
  name = "${var.project_name}-script-user"

  tags = var.tags
}

# Local script permissions: Upload to S3
resource "aws_iam_user_policy" "script_s3_access" {
  name = "${var.project_name}-script-s3-policy"
  user = aws_iam_user.script_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.s3_bucket_name}",
          "arn:aws:s3:::${var.s3_bucket_name}/*"
        ]
      }
    ]
  })
}

# Create access keys for script user (output only, never in git)
resource "aws_iam_access_key" "script_user" {
  user = aws_iam_user.script_user.name
}

# =====================================================
# IAM ROLE FOR API GATEWAY
# =====================================================

resource "aws_iam_role" "api_gateway_role" {
  name = "${var.project_name}-api-gateway-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

# API Gateway can invoke Lambda
resource "aws_iam_role_policy" "api_gateway_invoke_lambda" {
  name = "${var.project_name}-api-gateway-invoke-lambda"
  role = aws_iam_role.api_gateway_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = "*"
      }
    ]
  })
}
