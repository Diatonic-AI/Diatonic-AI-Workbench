# AI Nexus Workbench - Development Environment Configuration
# Terraform variables for the comprehensive backend integration

# Core Infrastructure
project     = "aws-devops"
environment = "dev" 
aws_region  = "us-east-2"

# API Gateway Configuration
cors_origins = [
  "https://dev.diatonic.ai",
  "http://localhost:3000",
  "http://localhost:5173"
]

# Lambda Configuration
lambda_runtime      = "nodejs18.x"
lambda_timeout      = 30
lambda_memory_size  = 256
lambda_vpc_config   = false # Keep simple for dev

# DynamoDB Configuration
dynamodb_billing_mode            = "PAY_PER_REQUEST"
enable_point_in_time_recovery    = false # Save cost in dev
enable_dynamodb_encryption       = false # Save cost in dev

# Multi-Tenant Configuration
default_organization_id = "dev-org"
enable_tenant_isolation = true

# Feature Flags - Start with Education only
enable_education_api     = true
enable_projects_api      = false # Add later
enable_agents_api        = false # Add later
enable_lab_api          = false # Add later
enable_community_api     = false # Add later
enable_notifications_api = false # Add later
enable_analytics_api     = false # Add later

# Monitoring and Logging
enable_detailed_monitoring = false # Save cost in dev
log_retention_days        = 7
enable_xray_tracing       = false # Save cost in dev

# Security Configuration
enable_waf            = false # Not needed in dev
allowed_cidr_blocks   = ["0.0.0.0/0"] # Open for dev

# Cost Optimization
enable_cost_optimization   = true
lambda_reserved_concurrency = null # No reserved concurrency in dev

# Development and Testing
enable_debug_mode = true
create_test_data  = true

# Additional Tags
additional_tags = {
  Environment = "development"
  Owner       = "ai-nexus-team"
  CostCenter  = "development"
  Purpose     = "comprehensive-backend"
}

# S3 Integration
s3_bucket_prefix              = ""
enable_s3_event_notifications = false # Add later

# OpenAPI Configuration
generate_openapi_spec = true
api_version          = "v1"
