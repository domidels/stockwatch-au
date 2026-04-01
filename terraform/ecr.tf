# =====================================================
# ECR REPOSITORIES — Docker images for Lambda
# =====================================================

resource "aws_ecr_repository" "ingestion" {
  name                 = "${var.project_name}-ingestion"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

resource "aws_ecr_repository" "api_handler" {
  name                 = "${var.project_name}-api-handler"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

output "ecr_ingestion_url" {
  description = "ECR URL for ingestion Lambda image"
  value       = aws_ecr_repository.ingestion.repository_url
}

output "ecr_api_handler_url" {
  description = "ECR URL for API handler Lambda image"
  value       = aws_ecr_repository.api_handler.repository_url
}
