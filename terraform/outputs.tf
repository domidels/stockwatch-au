# =====================================================
# OUTPUTS - No sensitive data exposed!
# =====================================================

output "s3_data_bucket_name" {
  description = "S3 bucket for data storage"
  value       = aws_s3_bucket.data_bucket.id
}

output "s3_frontend_bucket_name" {
  description = "S3 bucket for frontend hosting"
  value       = aws_s3_bucket.frontend_bucket.id
}

output "acm_validation_records" {
  description = "CNAME records to add in Cloudflare to validate the ACM certificate"
  value = {
    for dvo in aws_acm_certificate.frontend.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain"
  value       = var.cloudfront_enabled ? aws_cloudfront_distribution.frontend[0].domain_name : "Not enabled"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for invalidation"
  value       = var.cloudfront_enabled ? aws_cloudfront_distribution.frontend[0].id : "Not enabled"
}

output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_api_gateway_stage.api.invoke_url
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.api_handler.function_name
}

# =====================================================
# CREDENTIALS SETUP INSTRUCTIONS
# =====================================================

output "setup_instructions" {
  description = "Instructions for credentials setup"
  sensitive   = true
  value       = <<-EOT
    
    ✅ TERRAFORM DEPLOYMENT COMPLETE!
    
    🔐 NEXT STEPS - Add credentials:
    
    1. Set S3 credentials for Snowflake:
       aws secretsmanager create-secret \
         --name stockwatch-au-s3-credentials \
         --secret-string '{"access_key":"YOUR_KEY","secret_key":"YOUR_SECRET"}'
    
    2. Configure local AWS credentials for your scripts:
       aws configure
       
       AWS Access Key ID: ${aws_iam_access_key.script_user.id}
       AWS Secret Access Key: ${aws_iam_access_key.script_user.secret}
       
    3. Update frontend with API endpoint:
       Frontend API URL: ${aws_api_gateway_stage.api.invoke_url}
    
    4. Deploy frontend to S3:
       aws s3 sync frontend/build s3://${aws_s3_bucket.frontend_bucket.id} --delete
    
    5. Invalidate CloudFront (after frontend update):
       aws cloudfront create-invalidation \
         --distribution-id ${var.cloudfront_enabled ? aws_cloudfront_distribution.frontend[0].id : "NOT_ENABLED"} \
         --paths "/*"
    
    🎯 Architecture is ready!
    📊 Data Flow:
       Your scripts → S3 (via IAM user)
       Lambda → Snowflake (via Secrets Manager)
       Frontend → Lambda API (via CloudFront)
    
    💰 Cost Monitoring:
       CloudWatch Logs: Lambda execution
       S3: Lifecycle policies for cost optimization
       API Gateway: Free tier includes 1M requests/month
  EOT
}

output "script_user_access_key" {
  description = "Access key ID for local scripts (use in aws configure)"
  value       = aws_iam_access_key.script_user.id
  sensitive   = true
}

output "script_user_secret_key" {
  description = "Secret access key for local scripts (use in aws configure) - KEEP SECRET!"
  value       = aws_iam_access_key.script_user.secret
  sensitive   = true
}

output "snowflake_secret_name" {
  description = "Secrets Manager secret name for Snowflake credentials"
  value       = aws_secretsmanager_secret.snowflake_credentials.name
}
