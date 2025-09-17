# AI Nexus Workbench - Production Configuration for diatonic.ai
# Cloudflare DNS + AWS Infrastructure

# Core AWS Configuration
aws_region = "us-east-2"
project    = "ai-nexus-workbench"
environment = "prod"

# Infrastructure Integration
use_existing_vpc           = true
use_existing_infrastructure = true

# Production Features
enable_backup             = true
enable_monitoring         = true
enable_api_logging        = true
api_log_level             = "INFO"
enable_detailed_monitoring = true
enable_waf                = true

# CORS Configuration for diatonic.ai domains
allowed_cors_origins = [
  "https://diatonic.ai",
  "https://www.diatonic.ai", 
  "https://app.diatonic.ai",
  "https://dev.diatonic.ai"
]

# API Gateway Custom Domain (certificate ARN to be added after ACM cert is issued)
custom_domain_name  = "api.diatonic.ai"
# acm_certificate_arn = "arn:aws:acm:us-east-2:313476888312:certificate/CERT_ID"

# No Route53 needed - using Cloudflare
# route53_zone_id = ""

# Cognito Configuration
mfa_configuration = "OPTIONAL"

# Enhanced Production Settings
enable_point_in_time_recovery = true
dynamodb_billing_mode = "PAY_PER_REQUEST"

# Lambda Configuration
lambda_runtime = "python3.11"
lambda_timeout = 60
lambda_memory_size = 512
lambda_architecture = "arm64"  # Cost optimization

# API Gateway Settings
api_gateway_stage_name = "prod"
api_throttle_burst_limit = 2000
api_throttle_rate_limit = 1000

# Monitoring & Alerts
log_retention_days = 30
enable_detailed_monitoring = true
notification_email = ""  # Add your email for alerts

# Security
enable_cost_optimization = true
enable_debug_logging = false

# Tagging
additional_tags = {
  "env"          = "prod"
  "project"      = "ai-nexus-workbench"
  "dns"          = "cloudflare"
  "domain"       = "diatonic.ai"
  "managed_by"   = "terraform"
  "cost_center"  = "ai-nexus"
}

# Production-specific feature flags
feature_flags = {
  "enable_analytics"    = true
  "enable_monitoring"   = true
  "enable_file_upload"  = true
  "enable_stripe"       = true
}
