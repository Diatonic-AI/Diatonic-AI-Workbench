# AI Nexus Workbench - Development Environment Configuration
# This file contains variable values for the development environment

# Basic Configuration
aws_region  = "us-east-2"
project     = "aws-devops"
environment = "dev"

# Infrastructure Configuration
use_existing_vpc            = false
use_existing_infrastructure = false
enable_backup               = false
enable_monitoring           = true

# Cognito Configuration
mfa_configuration = "OPTIONAL"

cognito_password_policy = {
  minimum_length                   = 8
  require_lowercase                = true
  require_numbers                  = true
  require_symbols                  = false # Relaxed for dev
  require_uppercase                = true
  temporary_password_validity_days = 7
}

# DynamoDB Configuration  
dynamodb_billing_mode         = "PAY_PER_REQUEST"
enable_point_in_time_recovery = false # Disabled for cost savings in dev

# Lambda Configuration
lambda_runtime              = "python3.11"
lambda_timeout              = 30
lambda_memory_size          = 256
lambda_reserved_concurrency = null
lambda_architecture         = "x86_64"

# API Gateway Configuration
api_gateway_stage_name   = "dev"
api_throttle_burst_limit = 500 # Lower limits for dev
api_throttle_rate_limit  = 250
enable_api_logging       = true
api_log_level            = "INFO"

# S3 Configuration
s3_versioning_enabled        = false # Disabled for cost savings
s3_lifecycle_enabled         = false
s3_lifecycle_transition_days = 30
s3_lifecycle_expiration_days = 90

# Security Configuration
enable_waf = false # Disabled for development
allowed_cors_origins = [
  "http://localhost:3000",
  "https://localhost:3000",
  "http://127.0.0.1:3000",
  "https://127.0.0.1:3000",
  "http://localhost:3001",
  "https://localhost:3001"
]
rate_limit_requests_per_minute = 200 # Higher limit for development

# Monitoring Configuration
enable_detailed_monitoring = false
notification_email         = "" # Set this if you want alerts
log_retention_days         = 7  # Shorter retention for cost savings

# Feature Flags
feature_flags = {
  enable_advanced_user_attributes = true # Enabled for testing
  enable_social_login             = false
  enable_device_tracking          = false
  enable_user_analytics           = false
}

# Cost Optimization
enable_cost_optimization = true

# Development Settings
enable_local_development = true
enable_debug_logging     = true

# Domain Configuration (disabled for development)
domain_name           = ""  # Empty to disable custom domain
acm_certificate_arn   = ""  # Empty since no custom domain
custom_domain_name    = ""  # Empty since no custom domain  

# Additional Tags
additional_tags = {
  Owner        = "Development Team"
  Purpose      = "Development and Testing"
  AutoShutdown = "true"
  CostCenter   = "Development"
  Backup       = "false"
}
