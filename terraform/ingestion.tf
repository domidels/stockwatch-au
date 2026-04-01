# =====================================================
# LAMBDA INGESTION — Daily ASX data pipeline
# =====================================================

resource "aws_lambda_function" "ingestion" {
  function_name = "${var.project_name}-ingestion"
  role          = aws_iam_role.lambda_role.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.ingestion.repository_url}:latest"
  timeout       = 300
  memory_size   = 512

  environment {
    variables = {
      S3_BUCKET             = var.s3_bucket_name
      SNOWFLAKE_SECRET_NAME = aws_secretsmanager_secret.snowflake_credentials.name
      S3_SECRET_NAME        = aws_secretsmanager_secret.s3_credentials.name
      ENVIRONMENT           = var.environment
    }
  }

  tags = var.tags
}

# =====================================================
# EVENTBRIDGE — Daily trigger at 16:30 Sydney (06:30 UTC)
# ASX closes at 16:00 Sydney, +30 min buffer
# =====================================================

resource "aws_cloudwatch_event_rule" "daily_ingestion" {
  name                = "${var.project_name}-daily-ingestion"
  description         = "Trigger ASX ingestion daily after market close"
  schedule_expression = "cron(30 6 ? * MON-FRI *)"  # 06:30 UTC = 16:30 Sydney (AEST)

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "ingestion_target" {
  rule      = aws_cloudwatch_event_rule.daily_ingestion.name
  target_id = "ingestion-lambda"
  arn       = aws_lambda_function.ingestion.arn
}

resource "aws_lambda_permission" "eventbridge_ingestion" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ingestion.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_ingestion.arn
}

# =====================================================
# IAM — Write permission on S3 for ingestion Lambda
# =====================================================

resource "aws_iam_role_policy" "lambda_s3_write" {
  name = "${var.project_name}-lambda-s3-write"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "arn:aws:s3:::${var.s3_bucket_name}/raw/*"
      }
    ]
  })
}

# =====================================================
# OUTPUT
# =====================================================

output "ingestion_function_name" {
  description = "Ingestion Lambda function name"
  value       = aws_lambda_function.ingestion.function_name
}
