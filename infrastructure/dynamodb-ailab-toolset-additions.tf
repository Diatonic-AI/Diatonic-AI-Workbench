# AI Nexus Workbench - Additional DynamoDB Tables for AI Lab and Toolset
# These tables extend the comprehensive schema to fully support frontend functionality

# Agent Templates Table - Reusable flow patterns and templates
resource "aws_dynamodb_table" "agent_templates" {
  name         = "${local.name_prefix}-agent-templates"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "template_id"

  attribute {
    name = "template_id"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "usage_count"
    type = "N"
  }

  attribute {
    name = "rating"
    type = "N"
  }

  attribute {
    name = "is_public"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "tenant_id"
    type = "S"
  }

  # GSI for browsing templates by category and rating
  global_secondary_index {
    name      = "category-rating-index"
    hash_key  = "category"
    range_key = "rating"

    projection_type = "ALL"
  }

  # GSI for public templates by usage
  global_secondary_index {
    name      = "public-usage-index"  
    hash_key  = "is_public"
    range_key = "usage_count"

    projection_type = "ALL"
  }

  # GSI for tenant templates
  global_secondary_index {
    name      = "tenant-templates-index"
    hash_key  = "tenant_id"
    range_key = "created_at"

    projection_type = "ALL"
  }

  # GSI for popular templates
  global_secondary_index {
    name      = "popular-templates-index"
    hash_key  = "category"
    range_key = "usage_count"

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
    Name        = "${local.name_prefix}-agent-templates"
    Type        = "AgentBuilder"
    Description = "Reusable agent flow templates and patterns"
  })
}

# Enhanced Flow Nodes Table - Detailed node configurations for agent builder
resource "aws_dynamodb_table" "flow_node_configs" {
  name         = "${local.name_prefix}-flow-node-configs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "flow_id"
  range_key    = "node_id"

  attribute {
    name = "flow_id"
    type = "S"
  }

  attribute {
    name = "node_id"
    type = "S"
  }

  attribute {
    name = "node_type"
    type = "S"
  }

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  # GSI for querying nodes by type
  global_secondary_index {
    name      = "node-type-index"
    hash_key  = "node_type"
    range_key = "updated_at"

    projection_type = "ALL"
  }

  # GSI for tenant-specific flows
  global_secondary_index {
    name      = "tenant-flows-index"
    hash_key  = "tenant_id"
    range_key = "flow_id"

    projection_type = "ALL"
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-flow-node-configs"
    Type        = "AgentBuilder"
    Description = "Enhanced node configurations for agent flows"
  })
}

# Agent Execution History Table - Track agent runs and performance
resource "aws_dynamodb_table" "agent_execution_history" {
  name         = "${local.name_prefix}-agent-execution-history"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "agent_id"
  range_key    = "run_id"

  attribute {
    name = "agent_id"
    type = "S"
  }

  attribute {
    name = "run_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "started_at"
    type = "S"
  }

  attribute {
    name = "completed_at"
    type = "S"
  }

  # GSI for user's agent runs
  global_secondary_index {
    name      = "user-runs-index"
    hash_key  = "user_id"
    range_key = "started_at"

    projection_type = "ALL"
  }

  # GSI for tenant runs
  global_secondary_index {
    name      = "tenant-runs-index"
    hash_key  = "tenant_id"
    range_key = "started_at"

    projection_type = "ALL"
  }

  # GSI for status-based queries
  global_secondary_index {
    name      = "status-runs-index"
    hash_key  = "status"
    range_key = "started_at"

    projection_type = "ALL"
  }

  # GSI for completed runs (for analytics)
  global_secondary_index {
    name      = "completed-runs-index"
    hash_key  = "tenant_id"
    range_key = "completed_at"

    projection_type = "ALL"
  }

  # TTL for automatic cleanup of old execution history (180 days)
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-agent-execution-history"
    Type        = "AgentBuilder"
    Description = "Agent execution history and performance tracking"
  })
}

# Lab Model Registry Table - Enhanced model management for AI Lab
resource "aws_dynamodb_table" "lab_model_registry" {
  name         = "${local.name_prefix}-lab-model-registry"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "tenant_id"
  range_key    = "model_id"

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "model_id"
    type = "S"
  }

  attribute {
    name = "project_id"
    type = "S"
  }

  attribute {
    name = "model_type"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  attribute {
    name = "deployment_status"
    type = "S"
  }

  # GSI for project models
  global_secondary_index {
    name      = "project-models-index"
    hash_key  = "project_id"
    range_key = "updated_at"

    projection_type = "ALL"
  }

  # GSI for models by type and status
  global_secondary_index {
    name      = "type-status-index"
    hash_key  = "model_type"
    range_key = "status"

    projection_type = "ALL"
  }

  # GSI for deployment status
  global_secondary_index {
    name      = "deployment-status-index"
    hash_key  = "deployment_status"
    range_key = "updated_at"

    projection_type = "ALL"
  }

  # GSI for tenant model management
  global_secondary_index {
    name      = "tenant-updated-index"
    hash_key  = "tenant_id"
    range_key = "updated_at"

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
    Name        = "${local.name_prefix}-lab-model-registry"
    Type        = "AILab"
    Description = "Enhanced model registry for AI Lab experiments"
  })
}

# Experiment Run Logs Table - Detailed experiment execution logs
resource "aws_dynamodb_table" "experiment_run_logs" {
  name         = "${local.name_prefix}-experiment-run-logs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "experiment_id"
  range_key    = "log_timestamp"

  attribute {
    name = "experiment_id"
    type = "S"
  }

  attribute {
    name = "log_timestamp"
    type = "S"
  }

  attribute {
    name = "run_id"
    type = "S"
  }

  attribute {
    name = "log_level"
    type = "S"
  }

  attribute {
    name = "component_type"
    type = "S"
  }

  attribute {
    name = "tenant_id"
    type = "S"
  }

  # GSI for run-specific logs
  global_secondary_index {
    name      = "run-logs-index"
    hash_key  = "run_id"
    range_key = "log_timestamp"

    projection_type = "ALL"
  }

  # GSI for log level filtering
  global_secondary_index {
    name      = "level-logs-index"
    hash_key  = "log_level"
    range_key = "log_timestamp"

    projection_type = "ALL"
  }

  # GSI for component-specific logs
  global_secondary_index {
    name      = "component-logs-index"
    hash_key  = "component_type"
    range_key = "log_timestamp"

    projection_type = "ALL"
  }

  # GSI for tenant logs
  global_secondary_index {
    name      = "tenant-logs-index"
    hash_key  = "tenant_id"
    range_key = "log_timestamp"

    projection_type = "ALL"
  }

  # TTL for automatic cleanup of old logs (30 days)
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-experiment-run-logs"
    Type        = "AILab"
    Description = "Detailed experiment execution logs and monitoring"
  })
}

# Outputs for the new AI Lab and Toolset tables
output "ailab_toolset_dynamodb_tables" {
  description = "Additional DynamoDB tables for AI Lab and Toolset functionality"
  value = {
    agent_templates = {
      name = aws_dynamodb_table.agent_templates.name
      arn  = aws_dynamodb_table.agent_templates.arn
    }
    flow_node_configs = {
      name = aws_dynamodb_table.flow_node_configs.name
      arn  = aws_dynamodb_table.flow_node_configs.arn
    }
    agent_execution_history = {
      name = aws_dynamodb_table.agent_execution_history.name
      arn  = aws_dynamodb_table.agent_execution_history.arn
    }
    lab_model_registry = {
      name = aws_dynamodb_table.lab_model_registry.name
      arn  = aws_dynamodb_table.lab_model_registry.arn
    }
    experiment_run_logs = {
      name = aws_dynamodb_table.experiment_run_logs.name
      arn  = aws_dynamodb_table.experiment_run_logs.arn
    }
  }
}

# IAM policies for the new tables
output "ailab_toolset_table_arns" {
  description = "ARNs for IAM policy configuration"
  value = [
    aws_dynamodb_table.agent_templates.arn,
    "${aws_dynamodb_table.agent_templates.arn}/*",
    aws_dynamodb_table.flow_node_configs.arn,
    "${aws_dynamodb_table.flow_node_configs.arn}/*",
    aws_dynamodb_table.agent_execution_history.arn,
    "${aws_dynamodb_table.agent_execution_history.arn}/*",
    aws_dynamodb_table.lab_model_registry.arn,
    "${aws_dynamodb_table.lab_model_registry.arn}/*",
    aws_dynamodb_table.experiment_run_logs.arn,
    "${aws_dynamodb_table.experiment_run_logs.arn}/*"
  ]
}
