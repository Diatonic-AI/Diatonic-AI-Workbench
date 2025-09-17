# Stripe Billing Module for AI Nexus Workbench - Diatonicvisuals Tenant
# This module provides comprehensive Stripe integration with secure tenant isolation

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Data sources for existing infrastructure
data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

# Secrets Manager references (manually created)
data "aws_secretsmanager_secret" "stripe_secret_key" {
  name = "/ai-nexus/diatonicvisuals/stripe/secret_key"
}

data "aws_secretsmanager_secret_version" "stripe_secret_key" {
  secret_id = data.aws_secretsmanager_secret.stripe_secret_key.id
}

data "aws_secretsmanager_secret" "stripe_webhook_secret" {
  name = "/ai-nexus/diatonicvisuals/stripe/webhook_signing_secret"
}

# Stripe Provider Configuration (runtime secret fetch) - COMMENTED OUT
# Stripe products/prices will be configured via API instead
# provider "stripe" {
#   api_key = data.aws_secretsmanager_secret_version.stripe_secret_key.secret_string
# }

# Local values for consistent resource naming
locals {
  tenant_id    = "diatonicvisuals"
  app_name     = "ai-nexus-workbench"
  resource_prefix = "${var.project}-${var.environment}-stripe"
  
  # Common tags for all resources
  common_tags = merge(var.tags, {
    Project     = var.project
    Environment = var.environment
    Tenant      = local.tenant_id
    App         = local.app_name
    Module      = "stripe-billing"
    ManagedBy   = "terraform"
  })

  # Stripe metadata for tenant isolation
  stripe_metadata = {
    tenant_id = local.tenant_id
    app       = local.app_name
    env       = var.environment
  }
}

# DynamoDB Tables for Billing
resource "aws_dynamodb_table" "billing_customers" {
  name           = "${local.resource_prefix}-customers"
  billing_mode   = var.dynamodb_billing_mode
  hash_key       = "tenant_id"
  range_key      = "user_id"
  
  read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_read_capacity : null
  write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_write_capacity : null

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "stripe_customer_id"
    type = "S"
  }

  global_secondary_index {
    name            = "stripe-customer-index"
    hash_key        = "stripe_customer_id"
    projection_type = "ALL"
    
    read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_read_capacity : null
    write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_write_capacity : null
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  tags = local.common_tags
}

resource "aws_dynamodb_table" "billing_subscriptions" {
  name           = "${local.resource_prefix}-subscriptions"
  billing_mode   = var.dynamodb_billing_mode
  hash_key       = "tenant_id"
  range_key      = "subscription_id"
  
  read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_read_capacity : null
  write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_write_capacity : null

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "subscription_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "price_id"
    type = "S"
  }

  global_secondary_index {
    name            = "user-status-index"
    hash_key        = "user_id"
    range_key       = "status"
    projection_type = "ALL"
    
    read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_read_capacity : null
    write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_write_capacity : null
  }

  global_secondary_index {
    name            = "price-status-index"
    hash_key        = "price_id"
    range_key       = "status"
    projection_type = "ALL"
    
    read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_read_capacity : null
    write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_write_capacity : null
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  tags = local.common_tags
}

resource "aws_dynamodb_table" "billing_invoices" {
  name           = "${local.resource_prefix}-invoices"
  billing_mode   = var.dynamodb_billing_mode
  hash_key       = "tenant_id"
  range_key      = "invoice_id"
  
  read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_read_capacity : null
  write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_write_capacity : null

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "invoice_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "created"
    type = "N"
  }

  global_secondary_index {
    name            = "user-created-index"
    hash_key        = "user_id"
    range_key       = "created"
    projection_type = "ALL"
    
    read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_read_capacity : null
    write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? var.dynamodb_write_capacity : null
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  tags = local.common_tags
}

# Idempotency table for webhook processing
resource "aws_dynamodb_table" "billing_idempotency" {
  name           = "${local.resource_prefix}-idempotency"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "event_id"

  attribute {
    name = "event_id"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = local.common_tags
}

# Stripe Products and Prices - COMMENTED OUT
# These will be created via Stripe API and price IDs will be stored manually in SSM
# resource "stripe_product" "ai_nexus_workbench" {
#   name        = "AI Nexus Workbench - Diatonicvisuals"
#   description = "Comprehensive AI development platform for professional use"
#   type        = "service"
#   metadata    = local.stripe_metadata
# }

# Note: Price IDs will be stored in SSM parameters after API creation
# The following SSM parameters will be created manually or via API after Stripe setup:
# /ai-nexus/diatonicvisuals/stripe/prices/premium_monthly
# /ai-nexus/diatonicvisuals/stripe/prices/premium_annual
# /ai-nexus/diatonicvisuals/stripe/prices/enterprise_placeholder
