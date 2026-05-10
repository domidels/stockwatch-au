# =====================================================
# ACM CERTIFICATE
# Must be in us-east-1 — CloudFront requirement.
# =====================================================

resource "aws_acm_certificate" "frontend" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = ["www.${var.domain_name}"]

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

# Waits for DNS validation to complete.
# Steps:
#   1. Run `terraform apply` — the certificate is created and this resource blocks.
#   2. In another terminal: `terraform output acm_validation_records`
#   3. Add each CNAME record in Cloudflare (DNS > Records).
#   4. Validation completes automatically (usually within 5 minutes).
resource "aws_acm_certificate_validation" "frontend" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.frontend.arn
}
