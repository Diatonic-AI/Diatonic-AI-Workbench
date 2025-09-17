# AI Nexus Workbench - Leads & Sales DynamoDB Table
# Captures enterprise inquiries, contact requests, and sales qualified leads

resource "aws_dynamodb_table" "leads" {
  name         = "${local.name_prefix}-leads"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "lead_id"
  range_key    = "created_at"

  attribute {
    name = "lead_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "lead_source"
    type = "S"
  }

  attribute {
    name = "company_name"
    type = "S"
  }

  attribute {
    name = "priority_score"
    type = "N"
  }

  # Global Secondary Index for email lookups (prevent duplicates)
  global_secondary_index {
    name     = "email-index"
    hash_key = "email"

    projection_type = "ALL"
  }

  # Global Secondary Index for status filtering (new, contacted, qualified, converted)
  global_secondary_index {
    name      = "status-index"
    hash_key  = "status"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # Global Secondary Index for lead source analysis
  global_secondary_index {
    name      = "lead-source-index"
    hash_key  = "lead_source"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # Global Secondary Index for company lookups
  global_secondary_index {
    name      = "company-index"
    hash_key  = "company_name"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # Global Secondary Index for priority scoring (sales prioritization)
  global_secondary_index {
    name      = "priority-index"
    hash_key  = "status"
    range_key = "priority_score"

    projection_type = "ALL"
  }

  # TTL for automatic cleanup of old leads (configurable)
  ttl {
    attribute_name = "expires_at"
    enabled        = true
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
    Name        = "${local.name_prefix}-leads"
    Description = "Sales leads and enterprise inquiries"
    Purpose     = "Lead capture and sales funnel management"
  })
}

# Lead Activities Table - Track interactions and follow-ups
resource "aws_dynamodb_table" "lead_activities" {
  name         = "${local.name_prefix}-lead-activities"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "lead_id"
  range_key    = "activity_timestamp"

  attribute {
    name = "lead_id"
    type = "S"
  }

  attribute {
    name = "activity_timestamp"
    type = "S"
  }

  attribute {
    name = "activity_type"
    type = "S"
  }

  attribute {
    name = "sales_rep"
    type = "S"
  }

  # Global Secondary Index for activity type filtering
  global_secondary_index {
    name      = "activity-type-index"
    hash_key  = "activity_type"
    range_key = "activity_timestamp"

    projection_type = "ALL"
  }

  # Global Secondary Index for sales rep activity tracking
  global_secondary_index {
    name      = "sales-rep-index"
    hash_key  = "sales_rep"
    range_key = "activity_timestamp"

    projection_type = "ALL"
  }

  # TTL for automatic cleanup (2 years)
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-lead-activities"
    Description = "Lead interaction history and sales activities"
  })
}

# Outputs
output "leads_table" {
  description = "Leads DynamoDB table information"
  value = {
    name = aws_dynamodb_table.leads.name
    arn  = aws_dynamodb_table.leads.arn
  }
}

output "lead_activities_table" {
  description = "Lead activities DynamoDB table information"
  value = {
    name = aws_dynamodb_table.lead_activities.name
    arn  = aws_dynamodb_table.lead_activities.arn
  }
}