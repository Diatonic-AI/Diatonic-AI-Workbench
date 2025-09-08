# AI Nexus Workbench - DynamoDB Infrastructure
# This file creates the DynamoDB tables for user data, organization data, and application state

# User Profiles Table - Core user information and preferences
resource "aws_dynamodb_table" "user_profiles" {
  name         = "${local.name_prefix}-user-profiles"
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
    name = "created_at"
    type = "S"
  }

  # Global Secondary Index for email lookups
  global_secondary_index {
    name     = "email-index"
    hash_key = "email"

    projection_type = "ALL"
  }

  # Global Secondary Index for organization queries
  global_secondary_index {
    name      = "organization-index"
    hash_key  = "organization_id"
    range_key = "created_at"

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

  # TTL for inactive users (optional)
  ttl {
    attribute_name = "expires_at"
    enabled        = false # Can be enabled for cleanup of inactive test accounts
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-user-profiles"
    Description = "User profile and preference data"
  })
}

# Organization Data Table - Organization-specific data and settings
resource "aws_dynamodb_table" "organization_data" {
  name         = "${local.name_prefix}-organization-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "organization_id"
  range_key    = "data_type"

  attribute {
    name = "organization_id"
    type = "S"
  }

  attribute {
    name = "data_type"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  # Global Secondary Index for data type queries across organizations
  global_secondary_index {
    name      = "data-type-index"
    hash_key  = "data_type"
    range_key = "updated_at"

    projection_type = "ALL"
  }

  # Global Secondary Index for chronological queries
  global_secondary_index {
    name      = "created-at-index"
    hash_key  = "organization_id"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # Point-in-time recovery for production
  point_in_time_recovery {
    enabled = var.environment == "prod" ? true : false
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-organization-data"
    Description = "Organization-specific data and configurations"
  })
}

# System Logs Table - Application logs, audit trails, and system events
resource "aws_dynamodb_table" "system_logs" {
  name         = "${local.name_prefix}-system-logs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "log_id"
  range_key    = "timestamp"

  attribute {
    name = "log_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "event_type"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  # Global Secondary Index for user-specific log queries
  global_secondary_index {
    name      = "user-logs-index"
    hash_key  = "user_id"
    range_key = "timestamp"

    projection_type = "ALL"
  }

  # Global Secondary Index for event type queries
  global_secondary_index {
    name      = "event-type-index"
    hash_key  = "event_type"
    range_key = "timestamp"

    projection_type = "ALL"
  }

  # Global Secondary Index for daily aggregations
  global_secondary_index {
    name      = "daily-logs-index"
    hash_key  = "date"
    range_key = "timestamp"

    projection_type = "KEYS_ONLY"
  }

  # TTL for automatic log cleanup (90 days for dev/staging, 365 days for prod)
  ttl {
    attribute_name = "expires_at"
    enabled        = true
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
    Name        = "${local.name_prefix}-system-logs"
    Description = "System logs and audit trails"
  })
}

# User Sessions Table - Active session management and security
resource "aws_dynamodb_table" "user_sessions" {
  name         = "${local.name_prefix}-user-sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  # Global Secondary Index for user session queries
  global_secondary_index {
    name      = "user-sessions-index"
    hash_key  = "user_id"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # TTL for automatic session cleanup
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-user-sessions"
    Description = "User session management and tracking"
  })
}

# Application Settings Table - Global application configuration
resource "aws_dynamodb_table" "application_settings" {
  name         = "${local.name_prefix}-application-settings"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "setting_category"
  range_key    = "setting_key"

  attribute {
    name = "setting_category"
    type = "S"
  }

  attribute {
    name = "setting_key"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  # Global Secondary Index for chronological queries
  global_secondary_index {
    name      = "updated-at-index"
    hash_key  = "setting_category"
    range_key = "updated_at"

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
    Name        = "${local.name_prefix}-application-settings"
    Description = "Global application settings and configuration"
  })
}

# User Content Metadata Table - References to user-generated content in S3
resource "aws_dynamodb_table" "user_content_metadata" {
  name         = "${local.name_prefix}-user-content-metadata"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "content_id"

  attribute {
    name = "content_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "content_type"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "organization_id"
    type = "S"
  }

  # Global Secondary Index for user content queries
  global_secondary_index {
    name      = "user-content-index"
    hash_key  = "user_id"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # Global Secondary Index for content type queries
  global_secondary_index {
    name      = "content-type-index"
    hash_key  = "content_type"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # Global Secondary Index for organization content
  global_secondary_index {
    name      = "organization-content-index"
    hash_key  = "organization_id"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # TTL for cleanup of deleted content references
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-user-content-metadata"
    Description = "Metadata for user-generated content stored in S3"
  })
}

# S3 Bucket for user-generated content
resource "aws_s3_bucket" "user_content" {
  bucket = "${local.name_prefix}-user-content"

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-user-content"
    Description = "User-generated content and file uploads"
  })
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "user_content_versioning" {
  bucket = aws_s3_bucket.user_content.id
  versioning_configuration {
    status = var.environment == "prod" ? "Enabled" : "Suspended"
  }
}

# S3 bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "user_content_encryption" {
  bucket = aws_s3_bucket.user_content.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "user_content_pab" {
  bucket = aws_s3_bucket.user_content.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket lifecycle configuration
resource "aws_s3_bucket_lifecycle_configuration" "user_content_lifecycle" {
  bucket = aws_s3_bucket.user_content.id

  rule {
    id     = "user-content-lifecycle"
    status = "Enabled"

    filter {}

    # Delete incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    # Transition to Standard-IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Transition to Glacier after 90 days (only for prod)
    dynamic "transition" {
      for_each = var.environment == "prod" ? [1] : []
      content {
        days          = 90
        storage_class = "GLACIER"
      }
    }

    # Delete old versions after 90 days (only if versioning enabled)
    dynamic "noncurrent_version_expiration" {
      for_each = var.environment == "prod" ? [1] : []
      content {
        noncurrent_days = 90
      }
    }
  }
}

# S3 bucket CORS configuration
resource "aws_s3_bucket_cors_configuration" "user_content_cors" {
  bucket = aws_s3_bucket.user_content.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = [
      "http://localhost:3000",
      "http://localhost:8080",
      "https://dev.${var.domain_name}",
      "https://staging.${var.domain_name}",
      "https://${var.domain_name}"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Outputs for other resources
output "dynamodb_user_profiles_table_name" {
  description = "Name of the user profiles DynamoDB table"
  value       = aws_dynamodb_table.user_profiles.name
}

output "dynamodb_user_profiles_table_arn" {
  description = "ARN of the user profiles DynamoDB table"
  value       = aws_dynamodb_table.user_profiles.arn
}

output "dynamodb_organization_data_table_name" {
  description = "Name of the organization data DynamoDB table"
  value       = aws_dynamodb_table.organization_data.name
}

output "dynamodb_organization_data_table_arn" {
  description = "ARN of the organization data DynamoDB table"
  value       = aws_dynamodb_table.organization_data.arn
}

output "dynamodb_system_logs_table_name" {
  description = "Name of the system logs DynamoDB table"
  value       = aws_dynamodb_table.system_logs.name
}

output "dynamodb_system_logs_table_arn" {
  description = "ARN of the system logs DynamoDB table"
  value       = aws_dynamodb_table.system_logs.arn
}

output "dynamodb_user_sessions_table_name" {
  description = "Name of the user sessions DynamoDB table"
  value       = aws_dynamodb_table.user_sessions.name
}

output "dynamodb_application_settings_table_name" {
  description = "Name of the application settings DynamoDB table"
  value       = aws_dynamodb_table.application_settings.name
}

output "dynamodb_user_content_metadata_table_name" {
  description = "Name of the user content metadata DynamoDB table"
  value       = aws_dynamodb_table.user_content_metadata.name
}

output "s3_user_content_bucket_name" {
  description = "Name of the S3 bucket for user content"
  value       = aws_s3_bucket.user_content.id
}

output "s3_user_content_bucket_arn" {
  description = "ARN of the S3 bucket for user content"
  value       = aws_s3_bucket.user_content.arn
}
