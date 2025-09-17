# ================================================================================
# AI NEXUS WORKBENCH - COMPREHENSIVE BACKEND VARIABLES
# ================================================================================
# Variables for integrating comprehensive backend with existing infrastructure
# ================================================================================

# Core Infrastructure Variables (aligned with existing infrastructure)
variable "project" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "aws-devops"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.project))
    error_message = "Project name must be lowercase alphanumeric with hyphens."
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

# API Gateway Configuration
variable "cors_origins" {
  description = "List of allowed CORS origins"
  type        = list(string)
  default     = ["https://dev.diatonic.ai", "http://localhost:3000"]
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

# Lambda Configuration
variable "lambda_runtime" {
  description = "Lambda runtime version"
  type        = string
  default     = "nodejs18.x"
  validation {
    condition     = contains(["nodejs18.x", "nodejs20.x", "python3.11", "python3.12"], var.lambda_runtime)
    error_message = "Lambda runtime must be a supported version."
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

variable "lambda_vpc_config" {
  description = "Whether to configure Lambda functions with VPC access"
  type        = bool
  default     = false
}

# DynamoDB Configuration
variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode"
  type        = string
  default     = "PAY_PER_REQUEST"
  validation {
    condition     = contains(["PAY_PER_REQUEST", "PROVISIONED"], var.dynamodb_billing_mode)
    error_message = "DynamoDB billing mode must be PAY_PER_REQUEST or PROVISIONED."
  }
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for DynamoDB tables"
  type        = bool
  default     = true
}

variable "enable_dynamodb_encryption" {
  description = "Enable encryption at rest for DynamoDB tables"
  type        = bool
  default     = true
}

# Multi-Tenant Configuration
variable "default_organization_id" {
  description = "Default organization ID for development/testing"
  type        = string
  default     = "default-org"
}

variable "enable_tenant_isolation" {
  description = "Enable strict tenant isolation in IAM policies"
  type        = bool
  default     = true
}

# Feature Flags
variable "enable_education_api" {
  description = "Enable Education API endpoints"
  type        = bool
  default     = true
}

variable "enable_projects_api" {
  description = "Enable Projects API endpoints"
  type        = bool
  default     = true
}

variable "enable_agents_api" {
  description = "Enable Agents API endpoints"
  type        = bool
  default     = true
}

variable "enable_lab_api" {
  description = "Enable Lab/Experiments API endpoints"
  type        = bool
  default     = true
}

variable "enable_community_api" {
  description = "Enable Community API endpoints"
  type        = bool
  default     = true
}

variable "enable_notifications_api" {
  description = "Enable Notifications API endpoints"
  type        = bool
  default     = true
}

variable "enable_analytics_api" {
  description = "Enable Analytics API endpoints"
  type        = bool
  default     = false # Enable later after core features are working
}

# Monitoring and Logging
variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
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

variable "enable_xray_tracing" {
  description = "Enable AWS X-Ray tracing for Lambda functions"
  type        = bool
  default     = false
}

# Security Configuration
variable "enable_waf" {
  description = "Enable AWS WAF for API Gateway"
  type        = bool
  default     = false
}

variable "allowed_cidr_blocks" {
  description = "List of allowed CIDR blocks for API access"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Restrict in production
}

# Cost Optimization
variable "enable_cost_optimization" {
  description = "Enable cost optimization features"
  type        = bool
  default     = true
}

variable "lambda_reserved_concurrency" {
  description = "Reserved concurrency for Lambda functions"
  type        = number
  default     = null # No reserved concurrency by default
}

# Development and Testing
variable "enable_debug_mode" {
  description = "Enable debug mode for development"
  type        = bool
  default     = true
}

variable "create_test_data" {
  description = "Create test data for development"
  type        = bool
  default     = true
}

# Additional Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# S3 Integration
variable "s3_bucket_prefix" {
  description = "Prefix for S3 bucket names"
  type        = string
  default     = ""
}

variable "enable_s3_event_notifications" {
  description = "Enable S3 event notifications to Lambda"
  type        = bool
  default     = false
}

# OpenAPI Schema Configuration
variable "generate_openapi_spec" {
  description = "Generate OpenAPI specification for the API"
  type        = bool
  default     = true
}

variable "api_version" {
  description = "API version for OpenAPI specification"
  type        = string
  default     = "v1"
}
