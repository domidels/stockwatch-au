# =====================================================
# S3 BUCKET FOR DATA AND FRONTEND
# =====================================================

resource "aws_s3_bucket" "data_bucket" {
  bucket = var.s3_bucket_name

  tags = merge(var.tags, {
    Name = "${var.project_name}-data-bucket"
  })
}

# Block public access by default (security best practice)
resource "aws_s3_bucket_public_access_block" "data_bucket" {
  bucket = aws_s3_bucket.data_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# =====================================================
# VERSIONING (for cost optimization tracking)
# =====================================================

resource "aws_s3_bucket_versioning" "data_bucket" {
  bucket = aws_s3_bucket.data_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

# =====================================================
# LIFECYCLE POLICY (COST OPTIMIZATION)
# =====================================================

resource "aws_s3_bucket_lifecycle_configuration" "data_bucket" {
  bucket = aws_s3_bucket.data_bucket.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    filter {
      prefix = "asx_data_"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"  # 46% cost savings
    }

    transition {
      days          = 90
      storage_class = "GLACIER"      # 82% cost savings
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE" # 95% cost savings
    }

    expiration {
      days = 2555  # 7 years (optional)
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  rule {
    id     = "cleanup-temp-files"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 7
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# =====================================================
# S3 BUCKET FOR FRONTEND (CloudFront origin)
# =====================================================

resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "${var.s3_bucket_name}-frontend"

  tags = merge(var.tags, {
    Name = "${var.project_name}-frontend-bucket"
  })
}

resource "aws_s3_bucket_public_access_block" "frontend_bucket" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# =====================================================
# CLOUDFRONT DISTRIBUTION
# =====================================================

resource "aws_cloudfront_origin_access_identity" "frontend_oai" {
  comment = "${var.project_name} frontend OAI"
}

resource "aws_s3_bucket_policy" "frontend_bucket" {
  bucket = aws_s3_bucket.frontend_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAI"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.frontend_oai.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend_bucket.arn}/*"
      }
    ]
  })
}

resource "aws_cloudfront_distribution" "frontend" {
  count = var.cloudfront_enabled ? 1 : 0

  origin {
    domain_name = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_id   = "S3Frontend"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend_oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Frontend"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  ordered_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    path_pattern     = "/*.js"
    target_origin_id = "S3Frontend"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = var.tags
}

# =====================================================
# S3 BUCKET LOGGING (cost optimization tracking)
# =====================================================

resource "aws_s3_bucket_logging" "data_bucket" {
  bucket = aws_s3_bucket.data_bucket.id

  target_bucket = aws_s3_bucket.data_bucket.id
  target_prefix = "logs/"
}
