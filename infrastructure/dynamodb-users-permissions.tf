# AI Nexus Workbench - Users, Roles & Permissions DynamoDB Schema
# This file creates additional DynamoDB tables to support the comprehensive permission system
# including user roles, subscription tiers, permissions, and quota tracking

# Enhanced Users Table - Complete user profile with roles and subscription info
resource "aws_dynamodb_table" "users" {
  name         = "${local.name_prefix}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "organization_id"
    type = "S"
  }

  attribute {
    name = "role"
    type = "S"
  }

  attribute {
    name = "subscription_tier"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "last_login_at"
    type = "S"
  }

  # GSI for email lookups (unique)
  global_secondary_index {
    name     = "email-index"
    hash_key = "email"
    projection_type = "ALL"
  }

  # GSI for organization queries with role filtering
  global_secondary_index {
    name      = "organization-role-index"
    hash_key  = "organization_id"
    range_key = "role"
    projection_type = "ALL"
  }

  # GSI for subscription tier queries
  global_secondary_index {
    name      = "subscription-created-index"
    hash_key  = "subscription_tier"
    range_key = "created_at"
    projection_type = "ALL"
  }

  # GSI for recent user activity
  global_secondary_index {
    name      = "organization-login-index"
    hash_key  = "organization_id"
    range_key = "last_login_at"
    projection_type = "ALL"
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = var.environment == "prod" ? true : false
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-users"
    Description = "Enhanced user profiles with roles and subscription data"
  })
}

# User Permissions Table - Individual user permission assignments
resource "aws_dynamodb_table" "user_permissions" {
  name         = "${local.name_prefix}-user-permissions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "permission"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "permission"
    type = "S"
  }

  attribute {
    name = "granted_at"
    type = "S"
  }

  attribute {
    name = "granted_by"
    type = "S"
  }

  # GSI for permission-based queries
  global_secondary_index {
    name      = "permission-granted-index"
    hash_key  = "permission"
    range_key = "granted_at"
    projection_type = "ALL"
  }

  # GSI for granter tracking
  global_secondary_index {
    name      = "granted-by-index"
    hash_key  = "granted_by"
    range_key = "granted_at"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-user-permissions"
    Description = "Individual user permission assignments"
  })
}

# Roles Table - Define custom roles and their permissions
resource "aws_dynamodb_table" "roles" {
  name         = "${local.name_prefix}-roles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "role_id"

  attribute {
    name = "role_id"
    type = "S"
  }

  attribute {
    name = "organization_id"
    type = "S"
  }

  attribute {
    name = "role_type"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  # GSI for organization roles
  global_secondary_index {
    name      = "organization-created-index"
    hash_key  = "organization_id"
    range_key = "created_at"
    projection_type = "ALL"
  }

  # GSI for role type queries (internal, subscription, custom)
  global_secondary_index {
    name      = "type-created-index"
    hash_key  = "role_type"
    range_key = "created_at"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-roles"
    Description = "Role definitions and custom role management"
  })
}

# Role Permissions Table - Define which permissions belong to each role
resource "aws_dynamodb_table" "role_permissions" {
  name         = "${local.name_prefix}-role-permissions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "role_id"
  range_key    = "permission"

  attribute {
    name = "role_id"
    type = "S"
  }

  attribute {
    name = "permission"
    type = "S"
  }

  attribute {
    name = "feature_area"
    type = "S"
  }

  # GSI for feature area permissions
  global_secondary_index {
    name      = "feature-area-index"
    hash_key  = "feature_area"
    range_key = "permission"
    projection_type = "ALL"
  }

  # GSI for permission lookup
  global_secondary_index {
    name     = "permission-role-index"
    hash_key = "permission"
    range_key = "role_id"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-role-permissions"
    Description = "Role to permission mappings"
  })
}

# Subscription Limits Table - Track usage limits per user
resource "aws_dynamodb_table" "subscription_limits" {
  name         = "${local.name_prefix}-subscription-limits"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "limit_type"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "limit_type"
    type = "S"
  }

  attribute {
    name = "period_start"
    type = "S"
  }

  attribute {
    name = "subscription_tier"
    type = "S"
  }

  # GSI for period-based queries
  global_secondary_index {
    name      = "user-period-index"
    hash_key  = "user_id"
    range_key = "period_start"
    projection_type = "ALL"
  }

  # GSI for subscription tier analysis
  global_secondary_index {
    name      = "tier-period-index"
    hash_key  = "subscription_tier"
    range_key = "period_start"
    projection_type = "ALL"
  }

  # TTL for automatic cleanup of old usage data (90 days)
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-subscription-limits"
    Description = "User subscription limits and usage tracking"
  })
}

# User Quotas Table - Real-time tracking of user resource usage
resource "aws_dynamodb_table" "user_quotas" {
  name         = "${local.name_prefix}-user-quotas"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "quota_type"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "quota_type"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  attribute {
    name = "organization_id"
    type = "S"
  }

  # GSI for recent quota updates
  global_secondary_index {
    name      = "user-updated-index"
    hash_key  = "user_id"
    range_key = "updated_at"
    projection_type = "ALL"
  }

  # GSI for organization quota tracking
  global_secondary_index {
    name      = "organization-quota-index"
    hash_key  = "organization_id"
    range_key = "quota_type"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-user-quotas"
    Description = "Real-time user quota and usage tracking"
  })
}

# Cognito Group Mappings Table - Map Cognito groups to roles
resource "aws_dynamodb_table" "cognito_group_mappings" {
  name         = "${local.name_prefix}-cognito-group-mappings"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "cognito_group"

  attribute {
    name = "cognito_group"
    type = "S"
  }

  attribute {
    name = "role"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  # GSI for role to group mapping
  global_secondary_index {
    name      = "role-updated-index"
    hash_key  = "role"
    range_key = "updated_at"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-cognito-group-mappings"
    Description = "Cognito group to role mappings"
  })
}

# Organization Settings Table - Organization-level configuration and limits
resource "aws_dynamodb_table" "organization_settings" {
  name         = "${local.name_prefix}-organization-settings"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "organization_id"
  range_key    = "setting_type"

  attribute {
    name = "organization_id"
    type = "S"
  }

  attribute {
    name = "setting_type"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  # GSI for recent settings updates
  global_secondary_index {
    name      = "org-updated-index"
    hash_key  = "organization_id"
    range_key = "updated_at"
    projection_type = "ALL"
  }

  # GSI for settings type queries
  global_secondary_index {
    name      = "setting-updated-index"
    hash_key  = "setting_type"
    range_key = "updated_at"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-organization-settings"
    Description = "Organization-level settings and configuration"
  })
}

# Team Memberships Table - Enhanced team/organization membership with role management
resource "aws_dynamodb_table" "team_memberships" {
  name         = "${local.name_prefix}-team-memberships"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "organization_id"
  range_key    = "user_id"

  attribute {
    name = "organization_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "role"
    type = "S"
  }

  attribute {
    name = "joined_at"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  # GSI for user's memberships
  global_secondary_index {
    name      = "user-joined-index"
    hash_key  = "user_id"
    range_key = "joined_at"
    projection_type = "ALL"
  }

  # GSI for role-based queries
  global_secondary_index {
    name      = "org-role-index"
    hash_key  = "organization_id"
    range_key = "role"
    projection_type = "ALL"
  }

  # GSI for status-based queries
  global_secondary_index {
    name      = "org-status-index"
    hash_key  = "organization_id"
    range_key = "status"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-team-memberships"
    Description = "Team/organization memberships with role management"
  })
}

# Subscription Billing Table - Track subscription billing information
resource "aws_dynamodb_table" "subscription_billing" {
  name         = "${local.name_prefix}-subscription-billing"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "organization_id"
  range_key    = "billing_period"

  attribute {
    name = "organization_id"
    type = "S"
  }

  attribute {
    name = "billing_period"
    type = "S"
  }

  attribute {
    name = "subscription_tier"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  # GSI for subscription tier analysis
  global_secondary_index {
    name      = "tier-period-index"
    hash_key  = "subscription_tier"
    range_key = "billing_period"
    projection_type = "ALL"
  }

  # GSI for billing history
  global_secondary_index {
    name      = "org-created-index"
    hash_key  = "organization_id"
    range_key = "created_at"
    projection_type = "ALL"
  }

  # TTL for old billing records (5 years)
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-subscription-billing"
    Description = "Subscription billing and payment tracking"
  })
}

# Outputs for the new permission system tables
output "users_permissions_tables" {
  description = "DynamoDB tables for comprehensive user permission system"
  value = {
    users = {
      name = aws_dynamodb_table.users.name
      arn  = aws_dynamodb_table.users.arn
    }
    user_permissions = {
      name = aws_dynamodb_table.user_permissions.name
      arn  = aws_dynamodb_table.user_permissions.arn
    }
    roles = {
      name = aws_dynamodb_table.roles.name
      arn  = aws_dynamodb_table.roles.arn
    }
    role_permissions = {
      name = aws_dynamodb_table.role_permissions.name
      arn  = aws_dynamodb_table.role_permissions.arn
    }
    subscription_limits = {
      name = aws_dynamodb_table.subscription_limits.name
      arn  = aws_dynamodb_table.subscription_limits.arn
    }
    user_quotas = {
      name = aws_dynamodb_table.user_quotas.name
      arn  = aws_dynamodb_table.user_quotas.arn
    }
    cognito_group_mappings = {
      name = aws_dynamodb_table.cognito_group_mappings.name
      arn  = aws_dynamodb_table.cognito_group_mappings.arn
    }
    organization_settings = {
      name = aws_dynamodb_table.organization_settings.name
      arn  = aws_dynamodb_table.organization_settings.arn
    }
    team_memberships = {
      name = aws_dynamodb_table.team_memberships.name
      arn  = aws_dynamodb_table.team_memberships.arn
    }
    subscription_billing = {
      name = aws_dynamodb_table.subscription_billing.name
      arn  = aws_dynamodb_table.subscription_billing.arn
    }
  }
}
