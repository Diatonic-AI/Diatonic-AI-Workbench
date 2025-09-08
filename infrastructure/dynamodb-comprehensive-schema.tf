# AI Nexus Workbench - Comprehensive DynamoDB Schema
# Extended tables for Dashboard, AI Lab, Toolset, Education Center, and Community

# Lab Experiments Table - AI experimentation data
resource "aws_dynamodb_table" "lab_experiments" {
  name         = "${local.name_prefix}-lab-experiments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "experiment_id"
  range_key    = "version"

  attribute {
    name = "experiment_id"
    type = "S"
  }

  attribute {
    name = "version"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "workspace_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  # GSI for user experiments
  global_secondary_index {
    name      = "user-experiments-index"
    hash_key  = "user_id"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # GSI for workspace experiments
  global_secondary_index {
    name      = "workspace-experiments-index"
    hash_key  = "workspace_id"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # GSI for status filtering
  global_secondary_index {
    name      = "status-experiments-index"
    hash_key  = "status"
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

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-lab-experiments"
    Description = "AI Lab experiments and training runs"
  })
}

# Toolset Items Table - Available tools and resources
resource "aws_dynamodb_table" "toolset_items" {
  name         = "${local.name_prefix}-toolset-items"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "tool_id"

  attribute {
    name = "tool_id"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "name"
    type = "S"
  }

  # GSI for category browsing
  global_secondary_index {
    name      = "category-tools-index"
    hash_key  = "category"
    range_key = "name"

    projection_type = "ALL"
  }

  # GSI for chronological listing
  global_secondary_index {
    name      = "created-at-index"
    hash_key  = "category"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-toolset-items"
    Description = "AI tools and resources catalog"
  })
}

# Education Courses Table - Course content and structure
resource "aws_dynamodb_table" "education_courses" {
  name         = "${local.name_prefix}-education-courses"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "course_id"

  attribute {
    name = "course_id"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "difficulty_level"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "title"
    type = "S"
  }

  # GSI for category browsing
  global_secondary_index {
    name      = "category-courses-index"
    hash_key  = "category"
    range_key = "title"

    projection_type = "ALL"
  }

  # GSI for difficulty filtering
  global_secondary_index {
    name      = "difficulty-courses-index"
    hash_key  = "difficulty_level"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-education-courses"
    Description = "Educational courses and learning materials"
  })
}

# User Progress Table - Track user progress through courses
resource "aws_dynamodb_table" "user_progress" {
  name         = "${local.name_prefix}-user-progress"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "course_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "course_id"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  # GSI for course completion tracking
  global_secondary_index {
    name      = "course-progress-index"
    hash_key  = "course_id"
    range_key = "updated_at"

    projection_type = "ALL"
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-user-progress"
    Description = "User progress tracking for education courses"
  })
}

# Community Posts Table - Social features and discussions
resource "aws_dynamodb_table" "community_posts" {
  name         = "${local.name_prefix}-community-posts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "post_id"

  attribute {
    name = "post_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  # GSI for user posts
  global_secondary_index {
    name      = "user-posts-index"
    hash_key  = "user_id"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # GSI for category browsing
  global_secondary_index {
    name      = "category-posts-index"
    hash_key  = "category"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # GSI for status filtering
  global_secondary_index {
    name      = "status-posts-index"
    hash_key  = "status"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-community-posts"
    Description = "Community posts and social interactions"
  })
}

# Dashboard Metrics Table - System metrics and analytics
resource "aws_dynamodb_table" "dashboard_metrics" {
  name         = "${local.name_prefix}-dashboard-metrics"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "metric_type"
  range_key    = "timestamp"

  attribute {
    name = "metric_type"
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
    name = "date"
    type = "S"
  }

  # GSI for user-specific metrics
  global_secondary_index {
    name      = "user-metrics-index"
    hash_key  = "user_id"
    range_key = "timestamp"

    projection_type = "ALL"
  }

  # GSI for daily aggregations
  global_secondary_index {
    name      = "daily-metrics-index"
    hash_key  = "metric_type"
    range_key = "date"

    projection_type = "ALL"
  }

  # TTL for automatic cleanup of old metrics (90 days)
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-dashboard-metrics"
    Description = "Dashboard metrics and system analytics"
  })
}

# Outputs for the new tables
output "comprehensive_dynamodb_tables" {
  description = "All DynamoDB tables for AI Nexus Workbench"
  value = {
    lab_experiments = {
      name = aws_dynamodb_table.lab_experiments.name
      arn  = aws_dynamodb_table.lab_experiments.arn
    }
    toolset_items = {
      name = aws_dynamodb_table.toolset_items.name
      arn  = aws_dynamodb_table.toolset_items.arn
    }
    education_courses = {
      name = aws_dynamodb_table.education_courses.name
      arn  = aws_dynamodb_table.education_courses.arn
    }
    user_progress = {
      name = aws_dynamodb_table.user_progress.name
      arn  = aws_dynamodb_table.user_progress.arn
    }
    community_posts = {
      name = aws_dynamodb_table.community_posts.name
      arn  = aws_dynamodb_table.community_posts.arn
    }
    dashboard_metrics = {
      name = aws_dynamodb_table.dashboard_metrics.name
      arn  = aws_dynamodb_table.dashboard_metrics.arn
    }
  }
}
