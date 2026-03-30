variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-southeast-2"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "stockwatch-au"
}

# S3 Configuration
variable "s3_bucket_name" {
  description = "S3 bucket name for data and frontend"
  type        = string
  sensitive   = true
  # Must be provided in terraform.tfvars
}

# Snowflake Configuration (stored in Secrets Manager)
variable "snowflake_account" {
  description = "Snowflake account identifier"
  type        = string
  sensitive   = true
}

variable "snowflake_user" {
  description = "Snowflake username"
  type        = string
  sensitive   = true
}

variable "snowflake_private_key" {
  description = "Snowflake RSA private key (PEM content, no passphrase)"
  type        = string
  sensitive   = true
}

variable "snowflake_database" {
  description = "Snowflake database name"
  type        = string
  default     = "ASX_ANALYTICS"
}

variable "snowflake_schema" {
  description = "Snowflake schema name"
  type        = string
  default     = "PUBLIC"
}

variable "snowflake_warehouse" {
  description = "Snowflake warehouse name"
  type        = string
  default     = "COMPUTE_WH"
}

# Lambda Configuration
variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 60
}

variable "lambda_memory" {
  description = "Lambda function memory in MB"
  type        = number
  default     = 256
}

# CloudFront Configuration
variable "cloudfront_enabled" {
  description = "Enable CloudFront distribution"
  type        = bool
  default     = true
}

variable "domain_name" {
  description = "Custom domain name for CloudFront (optional)"
  type        = string
  default     = ""
}

# Tagging
variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default = {
    Owner       = "Data Engineer"
    CostCenter  = "Portfolio"
    Terraform   = "true"
  }
}
