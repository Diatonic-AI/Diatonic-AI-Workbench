# Development Environment - Stripe Billing Configuration
# AI Nexus Workbench - Diatonicvisuals Tenant

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # stripe = {
    #   source  = "stripe/stripe"
    #   version = "~> 1.9.0"
    # }
  }

  # Backend configuration should be uncommented and configured for your setup
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "ai-nexus-workbench/dev/stripe-billing/terraform.tfstate"
  #   region = "us-east-2"
  #   encrypt = true
  #   dynamodb_table = "terraform-locks"
  # }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ai-nexus-workbench"
      Environment = "dev"
      Tenant      = "diatonicvisuals"
      ManagedBy   = "terraform"
      Owner       = "development-team"
    }
  }
}

# Data sources for existing infrastructure
data "aws_cognito_user_pools" "existing_pools" {
  name = "ai-nexus-workbench-dev-user-pool"
}

data "aws_cognito_user_pool" "main_pool" {
  count = length(data.aws_cognito_user_pools.existing_pools.ids) > 0 ? 1 : 0
  user_pool_id = data.aws_cognito_user_pools.existing_pools.ids[0]
}

# Note: Stripe billing uses separate HTTP API Gateway v2
# No need to integrate with existing REST API Gateway v1

locals {
  # Use existing Cognito pool - AI Nexus Workbench User Pool (already deployed)
  cognito_pool_id = length(data.aws_cognito_user_pools.existing_pools.ids) > 0 ? data.aws_cognito_user_pools.existing_pools.ids[0] : "us-east-2_xkNeOGMu1"
  
  # Note: Using separate HTTP API Gateway for Stripe billing
  
  # Development-specific configurations
  dev_cors_origins = [
    "http://localhost:3000",
    "http://localhost:8080", 
    "https://localhost:3000",
    "https://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080"
  ]
}

# Stripe Billing Module
module "stripe_billing" {
  source = "../../modules/stripe-billing"

  # Environment Configuration
  project     = "ai-nexus"
  environment = "dev"
  
  # Connect to existing Cognito User Pool (bypass disabled)
  skip_cognito_check = false  # Using deployed AI Nexus Workbench User Pool
  
  # DynamoDB Configuration - On-demand for development
  dynamodb_billing_mode = "PAY_PER_REQUEST"
  enable_point_in_time_recovery = false # Cost optimization for dev

  # Stripe Configuration - Test mode pricing
  currency              = "usd"
  premium_monthly_price = 2900  # $29.00 for testing
  premium_annual_price  = 29000 # $290.00 for testing (no discount in dev)
  
  # Lambda Configuration
  lambda_runtime    = "nodejs20.x"
  lambda_timeout    = 30
  lambda_memory_size = 256

  # API Gateway Configuration - Create separate HTTP API Gateway for billing
  create_api_gateway = true   # Create new HTTP API Gateway for Stripe billing
  cognito_user_pool_id = local.cognito_pool_id
  allowed_cors_origins = local.dev_cors_origins

  # Feature Flags - Full features enabled in dev
  enable_tax_calculation   = true
  enable_promotion_codes   = true
  enable_stripe_partner_events = var.enable_stripe_partner_events  # Configurable partner events
  default_trial_period_days = 14  # 14-day trial for testing

  # Security Configuration - Relaxed for development
  enable_waf = false
  api_throttle_burst_limit = 2000
  api_throttle_rate_limit  = 1000

  # Monitoring Configuration
  log_retention_days = 7  # Short retention for cost savings
  enable_detailed_monitoring = false
  enable_dlq = true
  dlq_max_receive_count = 3

  # Development-specific tags
  tags = {
    Environment   = "dev"
    CostCenter    = "development"
    Team          = "ai-nexus-dev"
    BackupPolicy  = "none"
    Monitoring    = "basic"
  }
}

# Development-specific outputs
output "dev_stripe_config" {
  description = "Development environment Stripe configuration"
  value = {
    api_gateway_url      = module.stripe_billing.api_gateway_url
    webhook_endpoint_url = module.stripe_billing.webhook_endpoint_url
    # stripe_price_ids     = module.stripe_billing.stripe_price_ids  # Commented out
    # frontend_config      = module.stripe_billing.frontend_config   # Commented out
    tenant_config        = module.stripe_billing.tenant_config
  }
  sensitive = false
}

# output "dev_webhook_setup" {
#   description = "Webhook setup instructions for development"
#   value = module.stripe_billing.webhook_setup_instructions
#   sensitive = false
# }

output "dev_lambda_functions" {
  description = "Lambda function details for monitoring"
  value = module.stripe_billing.lambda_functions
  sensitive = false
}

# Development helper commands output
output "dev_commands" {
  description = "Useful commands for development workflow"
  value = {
    # stripe_cli_webhook = "stripe listen --forward-to ${module.stripe_billing.webhook_endpoint_url}"
    # test_webhook = "stripe trigger checkout.session.completed"
    view_logs = "aws logs tail /aws/lambda/ai-nexus-dev-stripe-stripe-webhook-handler --follow"
    check_tables = "aws dynamodb list-tables --query 'TableNames[?contains(@, `stripe`)]'"
    # get_price_ids = "aws ssm get-parameters --names ${join(" ", values(module.stripe_billing.ssm_price_parameters))}"
  }
}

# Variables for development environment
variable "aws_region" {
  description = "AWS region for development environment"
  type        = string
  default     = "us-east-2"
}

variable "skip_cognito_check" {
  description = "Skip Cognito checks for development (temporary)"
  type        = bool
  default     = false  # Using deployed AI Nexus Workbench User Pool
}

variable "enable_stripe_partner_events" {
  description = "Enable Stripe partner events for advanced billing features"
  type        = bool
  default     = false  # Disabled by default for cost optimization
}

# Development environment validations (conditional based on skip_cognito_check)
check "cognito_pool_exists" {
  assert {
    condition = var.skip_cognito_check || length(data.aws_cognito_user_pools.existing_pools.ids) > 0
    error_message = "No existing Cognito user pool found. Please ensure AI Nexus authentication is deployed first, or set skip_cognito_check=true for development."
  }
}
