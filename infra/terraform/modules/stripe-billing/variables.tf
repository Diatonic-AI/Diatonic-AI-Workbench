# Stripe Billing Module Variables
# Configuration for AI Nexus Workbench Stripe integration

variable "project" {
  description = "Project name for resource naming"
  type        = string
  default     = "ai-nexus"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# DynamoDB Configuration
variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode"
  type        = string
  default     = "PAY_PER_REQUEST"
  validation {
    condition     = contains(["PAY_PER_REQUEST", "PROVISIONED"], var.dynamodb_billing_mode)
    error_message = "DynamoDB billing mode must be either PAY_PER_REQUEST or PROVISIONED."
  }
}

variable "dynamodb_read_capacity" {
  description = "DynamoDB read capacity units (used when billing_mode is PROVISIONED)"
  type        = number
  default     = 5
}

variable "dynamodb_write_capacity" {
  description = "DynamoDB write capacity units (used when billing_mode is PROVISIONED)"
  type        = number
  default     = 5
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for DynamoDB tables"
  type        = bool
  default     = true
}

# Stripe Configuration
variable "currency" {
  description = "Currency for Stripe prices"
  type        = string
  default     = "usd"
  validation {
    condition     = length(var.currency) == 3
    error_message = "Currency must be a valid 3-letter ISO currency code."
  }
}

variable "premium_monthly_price" {
  description = "Premium monthly subscription price in cents (e.g., 2900 = $29.00)"
  type        = number
  default     = 2900
  validation {
    condition     = var.premium_monthly_price >= 0
    error_message = "Premium monthly price must be a non-negative integer."
  }
}

variable "premium_annual_price" {
  description = "Premium annual subscription price in cents (e.g., 29000 = $290.00)"
  type        = number
  default     = 29000
  validation {
    condition     = var.premium_annual_price >= 0
    error_message = "Premium annual price must be a non-negative integer."
  }
}

# Lambda Configuration
variable "lambda_runtime" {
  description = "Lambda runtime version"
  type        = string
  default     = "nodejs20.x"
  validation {
    condition     = contains(["nodejs18.x", "nodejs20.x"], var.lambda_runtime)
    error_message = "Lambda runtime must be a supported Node.js version."
  }
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
  validation {
    condition     = var.lambda_timeout >= 3 && var.lambda_timeout <= 900
    error_message = "Lambda timeout must be between 3 and 900 seconds."
  }
}

variable "lambda_memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 256
  validation {
    condition     = var.lambda_memory_size >= 128 && var.lambda_memory_size <= 10240
    error_message = "Lambda memory size must be between 128 and 10240 MB."
  }
}

# API Gateway Configuration
variable "api_gateway_id" {
  description = "Existing API Gateway ID to extend (optional)"
  type        = string
  default     = ""
}

variable "api_gateway_execution_arn" {
  description = "Existing API Gateway execution ARN (optional)"
  type        = string
  default     = ""
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID for API authorization"
  type        = string
}

variable "skip_cognito_check" {
  description = "Skip Cognito user pool existence checks (for development only)"
  type        = bool
  default     = false
}

variable "create_api_gateway" {
  description = "Whether to create a new API Gateway (false = extend existing)"
  type        = bool
  default     = false
}

variable "allowed_cors_origins" {
  description = "List of allowed CORS origins"
  type        = list(string)
  default     = ["http://localhost:3000", "https://localhost:3000"]
}

# Webhook Configuration  
variable "webhook_endpoint_base_url" {
  description = "Base URL for webhook endpoint (will be set after API Gateway creation)"
  type        = string
  default     = ""
}

# SQS Configuration for Dead Letter Queues
variable "enable_dlq" {
  description = "Enable Dead Letter Queues for Lambda functions"
  type        = bool
  default     = true
}

variable "dlq_max_receive_count" {
  description = "Maximum receive count before message goes to DLQ"
  type        = number
  default     = 3
}

# CloudWatch Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch retention period."
  }
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = false
}

# Feature Flags
variable "enable_tax_calculation" {
  description = "Enable Stripe Tax for automatic tax calculation"
  type        = bool
  default     = true
}

variable "enable_promotion_codes" {
  description = "Enable promotion codes in checkout sessions"
  type        = bool
  default     = true
}

variable "default_trial_period_days" {
  description = "Default trial period in days for new subscriptions"
  type        = number
  default     = 0
  validation {
    condition     = var.default_trial_period_days >= 0 && var.default_trial_period_days <= 365
    error_message = "Trial period must be between 0 and 365 days."
  }
}

# Security Configuration
variable "enable_waf" {
  description = "Enable AWS WAF for API Gateway"
  type        = bool
  default     = false
}

variable "api_throttle_burst_limit" {
  description = "API Gateway throttle burst limit"
  type        = number
  default     = 1000
}

variable "api_throttle_rate_limit" {
  description = "API Gateway throttle rate limit"
  type        = number
  default     = 500
}

# VPC Configuration (optional)
variable "vpc_id" {
  description = "VPC ID for Lambda functions (optional)"
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = "Subnet IDs for Lambda functions (optional)"
  type        = list(string)
  default     = []
}

variable "security_group_ids" {
  description = "Security Group IDs for Lambda functions (optional)"
  type        = list(string)
  default     = []
}

# Custom Domain Configuration
variable "custom_domain_name" {
  description = "Custom domain name for API Gateway (optional)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for custom domain (required if custom_domain_name is set)"
  type        = string
  default     = ""
}

# EventBridge Configuration
variable "enable_eventbridge" {
  description = "Enable EventBridge integration for webhook events"
  type        = bool
  default     = true
}

variable "event_archive_retention_days" {
  description = "EventBridge event archive retention in days"
  type        = number
  default     = 90
  validation {
    condition     = var.event_archive_retention_days >= 1 && var.event_archive_retention_days <= 2555
    error_message = "Event archive retention must be between 1 and 2555 days."
  }
}

variable "enable_event_replay" {
  description = "Enable EventBridge event replay capability"
  type        = bool
  default     = true
}
