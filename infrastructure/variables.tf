# AI Nexus Workbench - Terraform Variables
# Configuration variables for the authentication and user management system

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-2"
  validation {
    condition = contains([
      "us-east-1", "us-east-2", "us-west-1", "us-west-2",
      "eu-west-1", "eu-central-1", "ap-southeast-1"
    ], var.aws_region)
    error_message = "AWS region must be a valid region."
  }
}

variable "project" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "aws-devops"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.project))
    error_message = "Project name must be lowercase alphanumeric with hyphens, starting and ending with alphanumeric characters."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# Infrastructure Configuration
variable "use_existing_vpc" {
  description = "Whether to use existing VPC infrastructure"
  type        = bool
  default     = true
}

variable "use_existing_infrastructure" {
  description = "Whether to integrate with existing AWS DevOps infrastructure"
  type        = bool
  default     = true
}

variable "enable_backup" {
  description = "Enable automated backups for DynamoDB tables"
  type        = bool
  default     = false
}

variable "enable_monitoring" {
  description = "Enable enhanced monitoring and alerting"
  type        = bool
  default     = true
}

# Cognito User Pool Configuration
variable "cognito_password_policy" {
  description = "Password policy for Cognito User Pool"
  type = object({
    minimum_length                   = number
    require_lowercase                = bool
    require_numbers                  = bool
    require_symbols                  = bool
    require_uppercase                = bool
    temporary_password_validity_days = number
  })
  default = {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }
}

variable "cognito_user_groups" {
  description = "Cognito user groups configuration"
  type = map(object({
    description = string
    precedence  = number
  }))
  default = {
    "admin" = {
      description = "System administrators with full access"
      precedence  = 10
    }
    "premium_user" = {
      description = "Premium users with enhanced features"
      precedence  = 20
    }
    "standard_user" = {
      description = "Standard users with basic features"
      precedence  = 30
    }
    "read_only" = {
      description = "Read-only users with limited access"
      precedence  = 40
    }
  }
}

variable "mfa_configuration" {
  description = "MFA configuration for Cognito User Pool"
  type        = string
  default     = "OPTIONAL"
  validation {
    condition     = contains(["OFF", "ON", "OPTIONAL"], var.mfa_configuration)
    error_message = "MFA configuration must be one of: OFF, ON, OPTIONAL."
  }
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

# Lambda Configuration
variable "lambda_runtime" {
  description = "Lambda runtime version"
  type        = string
  default     = "python3.11"
  validation {
    condition     = contains(["python3.9", "python3.10", "python3.11", "python3.12"], var.lambda_runtime)
    error_message = "Lambda runtime must be a supported Python version."
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

variable "lambda_reserved_concurrency" {
  description = "Reserved concurrency for Lambda functions (set to null for no limit)"
  type        = number
  default     = null
}

# API Gateway Configuration
variable "api_gateway_stage_name" {
  description = "API Gateway deployment stage name"
  type        = string
  default     = "api"
  validation {
    condition     = can(regex("^[a-zA-Z0-9_-]+$", var.api_gateway_stage_name))
    error_message = "API Gateway stage name must contain only alphanumeric characters, underscores, and hyphens."
  }
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

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for custom domain"
  type        = string
  default     = ""
}

variable "custom_domain_name" {
  description = "Custom domain name for API Gateway"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for custom domain"
  type        = string
  default     = ""
}

# CORS Configuration
variable "allowed_cors_origins" {
  description = "List of allowed CORS origins"
  type        = list(string)
  default     = ["http://localhost:3000", "https://localhost:3000"]
}

variable "enable_waf" {
  description = "Enable AWS WAF for API Gateway"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch retention period."
  }
}

# Additional Configuration
variable "enable_api_logging" {
  description = "Enable API Gateway logging"
  type        = bool
  default     = true
}

variable "api_log_level" {
  description = "API Gateway log level"
  type        = string
  default     = "INFO"
  validation {
    condition     = contains(["ERROR", "INFO"], var.api_log_level)
    error_message = "API log level must be either ERROR or INFO."
  }
}

variable "rate_limit_requests_per_minute" {
  description = "Rate limit for API requests per minute per IP"
  type        = number
  default     = 100
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = false
}

variable "notification_email" {
  description = "Email address for alerts and notifications"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for custom domain (optional)"
  type        = string
  default     = ""
}

# Resource Naming
variable "resource_name_override" {
  description = "Optional override for resource names (uses project-environment by default)"
  type        = string
  default     = ""
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Cost Optimization
variable "enable_cost_optimization" {
  description = "Enable cost optimization features"
  type        = bool
  default     = true
}

variable "lambda_architecture" {
  description = "Lambda function architecture"
  type        = string
  default     = "x86_64"
  validation {
    condition     = contains(["x86_64", "arm64"], var.lambda_architecture)
    error_message = "Lambda architecture must be either x86_64 or arm64."
  }
}

# Development and Testing
variable "enable_local_development" {
  description = "Enable features for local development and testing"
  type        = bool
  default     = false
}

variable "enable_debug_logging" {
  description = "Enable debug logging for Lambda functions"
  type        = bool
  default     = false
}

# S3 Configuration Variables (to fix tfvars warnings)
variable "s3_versioning_enabled" {
  description = "Enable versioning for S3 buckets"
  type        = bool
  default     = true
}

variable "s3_lifecycle_enabled" {
  description = "Enable lifecycle management on S3 buckets"
  type        = bool
  default     = true
}

variable "s3_lifecycle_expiration_days" {
  description = "Number of days after which objects expire in S3 lifecycle"
  type        = number
  default     = 365
}

variable "s3_lifecycle_transition_days" {
  description = "Number of days after which objects transition to cheaper storage class"
  type        = number
  default     = 30
}

variable "s3_public_read_blocked" {
  description = "Block public read access to S3 buckets"
  type        = bool
  default     = true
}

variable "s3_public_write_blocked" {
  description = "Block public write access to S3 buckets"
  type        = bool
  default     = true
}

variable "feature_flags" {
  description = "Feature flags for enabling/disabling application features"
  type        = map(bool)
  default     = {}
}
