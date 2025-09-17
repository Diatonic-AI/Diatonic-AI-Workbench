# ================================================================================
# AI NEXUS WORKBENCH - COMPREHENSIVE BACKEND INTEGRATION
# ================================================================================
# This file integrates the comprehensive DynamoDB schema with existing
# core infrastructure, extending the API Gateway and adding Lambda functions.
# ================================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "Terraform"
      Component   = "ai-nexus-workbench-backend"
    }
  }
}

# Data sources for existing core infrastructure
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Data source for existing API Gateway (from infrastructure/)
data "aws_api_gateway_rest_api" "existing" {
  name = "aws-devops-dev-api"
}

# Data source for existing Cognito user pool (from infrastructure/)
data "aws_cognito_user_pool" "ai_nexus" {
  user_pool_id = "us-east-2_xkNeOGMu1"
}

# Data source for existing API Gateway authorizer (from infrastructure/)
data "aws_api_gateway_authorizer" "existing" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  authorizer_id = "gdalmb"
}

# Random ID for unique resource naming
resource "random_id" "unique_suffix" {
  byte_length = 4
}

# Local values for consistent naming and configuration
locals {
  # Naming convention aligned with existing infrastructure
  resource_prefix = "${var.project}-${var.environment}"
  unique_suffix   = random_id.unique_suffix.hex
  account_id      = data.aws_caller_identity.current.account_id
  region          = data.aws_region.current.name

  # Common tags applied to all resources
  common_tags = {
    Project     = var.project
    Environment = var.environment
    Component   = "ai-nexus-workbench"
    ManagedBy   = "Terraform"
    Owner       = "AI Nexus Team"
    CostCenter  = "Development"
  }

  # Lambda configuration based on environment
  lambda_config = {
    runtime                        = "nodejs18.x"
    timeout                       = 30
    memory_size                   = 256
    reserved_concurrent_executions = null
    environment_variables = {
      NODE_ENV           = var.environment
      # AWS_REGION automatically provided by Lambda runtime
      DYNAMODB_REGION    = local.region
      CORS_ORIGIN        = var.cors_origins[0]
      LOG_LEVEL         = var.environment == "prod" ? "info" : "debug"
    }
  }
}

# CloudWatch Log Group for comprehensive backend logs
resource "aws_cloudwatch_log_group" "comprehensive_backend_logs" {
  name              = "/aws/lambda/${local.resource_prefix}-comprehensive-backend"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-comprehensive-backend-logs"
  })
}

# Lambda execution role for comprehensive backend functions
resource "aws_iam_role" "comprehensive_backend_lambda_role" {
  name = "${local.resource_prefix}-comprehensive-backend-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.comprehensive_backend_lambda_role.name
}

# Attach VPC access policy if Lambda needs VPC access
resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  count      = var.lambda_vpc_config ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
  role       = aws_iam_role.comprehensive_backend_lambda_role.name
}

# Lambda deployment package directory
resource "null_resource" "lambda_packages_dir" {
  provisioner "local-exec" {
    command = "mkdir -p ${path.module}/../lambda"
  }
}

# ================================================================================
# OUTPUT INTEGRATION INFORMATION
# ================================================================================

output "integration_info" {
  description = "Information about the integrated infrastructure"
  value = {
    # Existing infrastructure references
    api_gateway_id        = data.aws_api_gateway_rest_api.existing.id
    api_gateway_root_id   = data.aws_api_gateway_rest_api.existing.root_resource_id
    cognito_user_pool_id  = data.aws_cognito_user_pool.ai_nexus.id
    cognito_authorizer_id = data.aws_api_gateway_authorizer.existing.id

    # New backend resources
    lambda_role_arn    = aws_iam_role.comprehensive_backend_lambda_role.arn
    lambda_log_group   = aws_cloudwatch_log_group.comprehensive_backend_logs.name
    resource_prefix    = local.resource_prefix
    unique_suffix      = local.unique_suffix
  }
}

# Output for frontend configuration
output "backend_config" {
  description = "Configuration values for frontend integration"
  value = {
    api_base_url    = "https://${data.aws_api_gateway_rest_api.existing.id}.execute-api.${local.region}.amazonaws.com/${var.environment}"
    cognito_pool_id = data.aws_cognito_user_pool.ai_nexus.id
    aws_region      = local.region
    environment     = var.environment
  }
}
