# AI Nexus Workbench - Main Terraform Configuration
# This is the complete, production-ready authentication and user management system

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  # Optional: Configure S3 backend for state management
  # Uncomment and configure if you want remote state storage
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "ai-nexus-workbench/terraform.tfstate"
  #   region         = "us-east-2"
  #   dynamodb_table = "terraform-state-locking"
  #   encrypt        = true
  # }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "Terraform"
      Component   = "ai-nexus-workbench"
    }
  }

  # Ignore tags that cause provider inconsistencies
  ignore_tags {
    key_prefixes = ["aws:"]
    keys         = ["CreatedDate", "LastModifiedDate"]
  }
}

# AWS Provider for US-East-1 (required for ACM certificates used with CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "Terraform"
      Component   = "ai-nexus-workbench"
    }
  }

  # Ignore tags that cause provider inconsistencies
  ignore_tags {
    key_prefixes = ["aws:"]
    keys         = ["CreatedDate", "LastModifiedDate"]
  }
}

# Data source for current AWS account ID and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Random ID for unique resource naming
resource "random_id" "unique_suffix" {
  byte_length = 4
}

# Additional local values specific to main.tf
locals {
  unique_suffix = random_id.unique_suffix.hex
}

# Data source for existing AWS DevOps VPC infrastructure
data "aws_vpc" "aws_devops_vpc" {
  count = var.use_existing_vpc ? 1 : 0

  filter {
    name   = "tag:Name"
    values = ["${var.project}-${var.environment}-vpc"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# Data source for existing private subnets
data "aws_subnets" "aws_devops_private" {
  count = var.use_existing_vpc ? 1 : 0

  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.aws_devops_vpc[0].id]
  }

  filter {
    name   = "tag:Tier"
    values = ["Private"]
  }
}

# Data source for existing public subnets
data "aws_subnets" "aws_devops_public" {
  count = var.use_existing_vpc ? 1 : 0

  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.aws_devops_vpc[0].id]
  }


  filter {
    name   = "tag:Tier"
    values = ["Public"]
  }
}

# Data source for existing S3 buckets to avoid naming conflicts
data "aws_s3_bucket" "existing_static_assets" {
  count  = var.use_existing_infrastructure ? 1 : 0
  bucket = "${var.project}-${var.environment}-static-assets"
}

data "aws_s3_bucket" "existing_application" {
  count  = var.use_existing_infrastructure ? 1 : 0
  bucket = "${var.project}-${var.environment}-application"
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${local.name_prefix}-ai-nexus"
  retention_in_days = local.current_env_config.log_retention_days

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-lambda-logs"
  })
}

# KMS Key for encryption (optional, for enhanced security)
resource "aws_kms_key" "ai_nexus_key" {
  count = var.environment == "prod" ? 1 : 0

  description             = "KMS key for AI Nexus Workbench encryption"
  deletion_window_in_days = 7

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "EnableServiceAccess"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "dynamodb.amazonaws.com",
            "s3.amazonaws.com"
          ]
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*",
          "kms:ReEncrypt*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-kms-key"
  })
}

resource "aws_kms_alias" "ai_nexus_key_alias" {
  count         = var.environment == "prod" ? 1 : 0
  name          = "alias/${local.name_prefix}-ai-nexus-key"
  target_key_id = aws_kms_key.ai_nexus_key[0].key_id
}

# SSM Parameter for storing configuration
resource "aws_ssm_parameter" "app_config" {
  name = "/apps/${var.project}/${var.environment}/ai-nexus/config"
  type = "String"
  value = jsonencode({
    version     = "1.0.0"
    environment = var.environment
    region      = local.region
    deployed_at = timestamp()
    features = {
      advanced_security = local.current_env_config.enable_advanced_security
      waf_enabled       = local.current_env_config.enable_waf
      backup_enabled    = local.current_env_config.enable_backup
    }
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-config"
  })
}

# Create Lambda deployment packages directory
resource "null_resource" "create_lambda_packages" {
  provisioner "local-exec" {
    command = "mkdir -p lambda-packages"
  }
}
