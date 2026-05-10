terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment below to use S3 backend for state (recommended for production)
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "stockwatch-au/terraform.tfstate"
  #   region         = "ap-southeast-2"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

# Retrieve the current AWS account ID at plan time — used in IAM ARNs
# to avoid hardcoding the account number in source control.
data "aws_caller_identity" "current" {}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "stockwatch-au"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "Portfolio"
    }
  }
}

# ACM certificates used by CloudFront must be created in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "stockwatch-au"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "Portfolio"
    }
  }
}
