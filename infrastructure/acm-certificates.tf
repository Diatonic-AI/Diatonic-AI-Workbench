# ACM Certificates Configuration
# These certificates are managed in us-east-1 for CloudFront compatibility

# Current certificate used in API Gateway
data "aws_acm_certificate" "main_api" {
  provider    = aws.us_east_1
  domain      = "diatonic.ai"
  statuses    = ["ISSUED"]
  most_recent = true
  
  # This will pick the most recent certificate for diatonic.ai
  # The imported certificates should be available after import
}

# Import existing ACM certificates
resource "aws_acm_certificate" "diatonic_main" {
  provider          = aws.us_east_1
  domain_name       = "diatonic.ai"
  validation_method = "DNS"
  
  subject_alternative_names = [
    "*.diatonic.ai"
  ]
  
  lifecycle {
    create_before_destroy = true
    prevent_destroy       = true
  }
  
  tags = merge(local.common_tags, {
    Name    = "diatonic-ai-main-certificate"
    Purpose = "Main domain certificate"
  })
}

resource "aws_acm_certificate" "dev_diatonic" {
  provider          = aws.us_east_1
  domain_name       = "dev.diatonic.ai"
  validation_method = "DNS"
  
  subject_alternative_names = [
    "*.dev.diatonic.ai"
  ]
  
  lifecycle {
    create_before_destroy = true
    prevent_destroy       = true
  }
  
  tags = merge(local.common_tags, {
    Name    = "dev-diatonic-ai-certificate"
    Purpose = "Development domain certificate"
  })
}

resource "aws_acm_certificate" "workbench_diatonic" {
  provider          = aws.us_east_1
  domain_name       = "workbench.diatonic.ai"
  validation_method = "DNS"
  
  lifecycle {
    create_before_destroy = true
    prevent_destroy       = true
  }
  
  tags = merge(local.common_tags, {
    Name    = "workbench-diatonic-ai-certificate"
    Purpose = "Workbench subdomain certificate"
  })
}
