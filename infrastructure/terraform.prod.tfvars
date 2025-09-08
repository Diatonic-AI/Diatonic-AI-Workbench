# AI Nexus Workbench - Production Environment Configuration
# This file contains variable values for the production environment

# Basic Configuration
aws_region  = "us-east-2"
project     = "aws-devops"
environment = "prod"

# Infrastructure Configuration
use_existing_vpc  = false # Set to true if using existing VPC
enable_backup     = true
enable_monitoring = true

# Cognito Configuration
mfa_configuration = "ON" # Required MFA for production

cognito_password_policy = {
  minimum_length                   = 12 # Stronger password requirements
  require_lowercase                = true
  require_numbers                  = true
  require_symbols                  = true
  require_uppercase                = true
  temporary_password_validity_days = 3 # Shorter validity for security
}

# DynamoDB Configuration  
dynamodb_billing_mode         = "PAY_PER_REQUEST" # Or "PROVISIONED" with capacity settings
enable_point_in_time_recovery = true

# If using PROVISIONED billing mode, uncomment and adjust:
# dynamodb_read_capacity  = 10
# dynamodb_write_capacity = 10

# Lambda Configuration
lambda_runtime              = "python3.11"
lambda_timeout              = 30
lambda_memory_size          = 512      # More memory for production
lambda_reserved_concurrency = 100      # Reserve capacity
lambda_architecture         = "x86_64" # Or "arm64" for cost savings

# API Gateway Configuration
api_gateway_stage_name   = "prod"
api_throttle_burst_limit = 2000 # Higher limits for production
api_throttle_rate_limit  = 1000
enable_api_logging       = true
api_log_level            = "ERROR" # Less verbose logging

# S3 Configuration
s3_versioning_enabled        = true
s3_lifecycle_enabled         = true
s3_lifecycle_transition_days = 30  # Move to IA after 30 days
s3_lifecycle_expiration_days = 365 # Delete old versions after 1 year

# Security Configuration
enable_waf = true # Enable WAF for production
allowed_cors_origins = [
  "https://your-production-domain.com",
  "https://www.your-production-domain.com"
  # Add your actual production domains here
]
rate_limit_requests_per_minute = 60 # Conservative limit for production

# Monitoring Configuration
enable_detailed_monitoring = true
notification_email         = "admin@your-domain.com" # Set your admin email
log_retention_days         = 90                      # Longer retention for compliance

# Custom Domain Configuration (Optional)
# Uncomment and configure if using a custom domain
# custom_domain_name = "api.your-domain.com"
# certificate_arn    = "arn:aws:acm:us-east-2:123456789012:certificate/your-cert-id"
# route53_zone_id   = "Z1234567890ABC"

# Feature Flags
feature_flags = {
  enable_advanced_user_attributes = true
  enable_social_login             = false # Enable if needed
  enable_device_tracking          = true  # For security monitoring
  enable_user_analytics           = true  # For business insights
}

# Cost Optimization
enable_cost_optimization = true

# Development Settings (disabled for production)
enable_local_development = false
enable_debug_logging     = false

# Additional Tags
additional_tags = {
  Owner      = "Production Team"
  Purpose    = "Production Workload"
  Compliance = "required"
  CostCenter = "Production"
  Backup     = "required"
  Security   = "high"
  SLA        = "99.9%"
}
