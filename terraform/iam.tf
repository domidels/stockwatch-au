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
          "arn:aws:s3:::${var.s3_bucket_name}/*",
          "arn:aws:s3:::${var.s3_bucket_name}-frontend",
          "arn:aws:s3:::${var.s3_bucket_name}-frontend/*"
        ]
      }
    ]
  })
}

# Create access keys for script user (output only, never in git)
resource "aws_iam_access_key" "script_user" {
  user = aws_iam_user.script_user.name
}

# CloudFront permissions for CI/CD (invalidate cache)
resource "aws_iam_user_policy" "script_cloudfront_access" {
  name = "${var.project_name}-script-cloudfront-policy"
  user = aws_iam_user.script_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudfront:ListDistributions",
          "cloudfront:CreateInvalidation"
        ]
        Resource = "*"
      }
    ]
  })
}

# Lambda permissions for CI/CD (update function code)
resource "aws_iam_user_policy" "script_lambda_access" {
  name = "${var.project_name}-script-lambda-policy"
  user = aws_iam_user.script_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:GetFunction"
        ]
        Resource = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-*"
      }
    ]
  })
}

# ECR permissions for CI/CD (push images)
resource "aws_iam_user_policy" "script_ecr_access" {
  name = "${var.project_name}-script-ecr-policy"
  user = aws_iam_user.script_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecr:DescribeRepositories",
          "ecr:ListImages"
        ]
        Resource = "*"
      }
    ]
  })
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
