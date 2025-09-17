# AI Nexus Workbench - Static Website Infrastructure
# This file configures S3 bucket for static website hosting
# Note: CloudFront distribution already exists and is managed by core infrastructure

# Data sources for existing resources
data "aws_s3_bucket" "static_assets" {
  bucket = "aws-devops-dev-static-assets-development-dzfngw8v"
}

# Data source for existing CloudFront distribution
# TODO: Update with correct distribution ID or remove if not needed
# data "aws_cloudfront_distribution" "existing" {
#   id = "EB3GDEPQ1RC9T"  # Existing distribution serving dev.diatonic.ai
# }

# S3 bucket website configuration
resource "aws_s3_bucket_website_configuration" "static_assets_website" {
  bucket = data.aws_s3_bucket.static_assets.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

# Note: S3 bucket policy removed since we don't need public access
# The existing CloudFront distribution handles access to static assets

# Note: CloudFront distribution already exists (EB3GDEPQ1RC9T) and manages dev.diatonic.ai
# We just need to ensure our S3 bucket is accessible to it

# Note: Security headers are managed by the existing CloudFront distribution

# Note: DNS records for dev.diatonic.ai already exist and point to existing CloudFront distribution

# Outputs for the frontend configuration
output "website_info" {
  description = "AI Nexus Workbench website information"
  value = {
    url                   = "https://dev.diatonic.ai"
    # cloudfront_domain     = data.aws_cloudfront_distribution.existing.domain_name
    # distribution_id       = data.aws_cloudfront_distribution.existing.id
    s3_bucket            = data.aws_s3_bucket.static_assets.id
    cloudfront_domain     = "dxz4p4iipx5lm.cloudfront.net"  # From DNS records
    distribution_note     = "CloudFront distribution managed by Amplify"
  }
}

output "deployment_commands" {
  description = "Commands to deploy frontend content"
  value = {
    sync_command = "aws s3 sync ./build/ s3://${data.aws_s3_bucket.static_assets.id}/ --delete"
    # invalidate_command = "aws cloudfront create-invalidation --distribution-id ${data.aws_cloudfront_distribution.existing.id} --paths '/*'"
    invalidate_note = "CloudFront invalidation handled by Amplify deployment"
  }
}
