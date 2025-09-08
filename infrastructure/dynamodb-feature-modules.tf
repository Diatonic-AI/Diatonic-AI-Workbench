# AI Nexus Workbench - Feature-Based DynamoDB Deployment Plan
# This file organizes additional DynamoDB tables by feature area for gradual rollout
#
# DEPLOYMENT PHASES:
# Phase 1: Project Management (workspaces, projects, memberships)
# Phase 2: Agent Builder (agents, flows, templates, prompts)
# Phase 3: AI Lab (models, datasets, experiments, metrics)
# Phase 4: Community Platform (posts, comments, reactions, groups)
# Phase 5: Education Center (courses, lessons, enrollments, quizzes)
# Phase 6: Analytics & Observatory (activity feed, aggregated analytics)
# Phase 7: Enhanced RBAC & Notifications

locals {
  # Feature deployment flags - set to true to deploy each feature area
  deploy_project_management = false
  deploy_agent_builder      = false
  deploy_ai_lab            = false
  deploy_community         = false
  deploy_education         = false
  deploy_analytics         = false
  deploy_notifications     = false
  deploy_enhanced_rbac     = false
}

# ================================================================================
# PHASE 1: PROJECT MANAGEMENT INFRASTRUCTURE
# Enable: deploy_project_management = true
# ================================================================================

# Projects Table - Central project management
resource "aws_dynamodb_table" "projects" {
  count        = local.deploy_project_management ? 1 : 0
  name         = "${local.name_prefix}-projects"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "project_id"

  attribute {
    name = "project_id"
    type = "S"
  }

  attribute {
    name = "organization_id"
    type = "S"
  }

  attribute {
    name = "owner_user_id"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  # GSI for organization projects ordered by update time
  global_secondary_index {
    name            = "organization-updated-index"
    hash_key        = "organization_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for user's owned projects ordered by update time
  global_secondary_index {
    name            = "owner-updated-index"
    hash_key        = "owner_user_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for organization projects ordered by creation time
  global_secondary_index {
    name            = "organization-created-index"
    hash_key        = "organization_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.environment == "prod" ? true : false
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-projects"
    FeatureArea = "ProjectManagement"
    Phase       = "1"
  })
}

# Workspaces Table - Higher-level project organization
resource "aws_dynamodb_table" "workspaces" {
  count        = local.deploy_project_management ? 1 : 0
  name         = "${local.name_prefix}-workspaces"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "workspace_id"

  attribute {
    name = "workspace_id"
    type = "S"
  }

  attribute {
    name = "organization_id"
    type = "S"
  }

  attribute {
    name = "owner_user_id"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  # GSI for organization workspaces
  global_secondary_index {
    name            = "organization-updated-index"
    hash_key        = "organization_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for user's owned workspaces
  global_secondary_index {
    name            = "owner-updated-index"
    hash_key        = "owner_user_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.environment == "prod" ? true : false
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-workspaces"
    FeatureArea = "ProjectManagement"
    Phase       = "1"
  })
}

# Project Memberships Table - User project roles and permissions
resource "aws_dynamodb_table" "project_memberships" {
  count        = local.deploy_project_management ? 1 : 0
  name         = "${local.name_prefix}-project-memberships"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "project_id"
  range_key    = "user_id"

  attribute {
    name = "project_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "project_role"
    type = "S"
  }

  attribute {
    name = "joined_at"
    type = "S"
  }

  # GSI for user's project memberships ordered by join time
  global_secondary_index {
    name            = "user-role-index"
    hash_key        = "user_id"
    range_key       = "joined_at"
    projection_type = "ALL"
  }

  # GSI for projects by role
  global_secondary_index {
    name            = "project-role-index"
    hash_key        = "project_id"
    range_key       = "project_role"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-project-memberships"
    FeatureArea = "ProjectManagement"
    Phase       = "1"
  })
}

# Workspace Memberships Table
resource "aws_dynamodb_table" "workspace_memberships" {
  count        = local.deploy_project_management ? 1 : 0
  name         = "${local.name_prefix}-workspace-memberships"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "workspace_id"
  range_key    = "user_id"

  attribute {
    name = "workspace_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "workspace_role"
    type = "S"
  }

  # GSI for user's workspace memberships
  global_secondary_index {
    name            = "user-role-index"
    hash_key        = "user_id"
    range_key       = "workspace_role"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-workspace-memberships"
    FeatureArea = "ProjectManagement"
    Phase       = "1"
  })
}

# ================================================================================
# PHASE 2: AGENT BUILDER INFRASTRUCTURE  
# Enable: deploy_agent_builder = true
# ================================================================================

# Agents Table - AI agent definitions
resource "aws_dynamodb_table" "agents" {
  count        = local.deploy_agent_builder ? 1 : 0
  name         = "${local.name_prefix}-agents"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "agent_id"

  attribute {
    name = "agent_id"
    type = "S"
  }

  attribute {
    name = "organization_id"
    type = "S"
  }

  attribute {
    name = "owner_user_id"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  attribute {
    name = "agent_status"
    type = "S"
  }

  # GSI for organization agents
  global_secondary_index {
    name            = "organization-updated-index"
    hash_key        = "organization_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for user's owned agents
  global_secondary_index {
    name            = "owner-updated-index"
    hash_key        = "owner_user_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for agents by status
  global_secondary_index {
    name            = "organization-status-index"
    hash_key        = "organization_id"
    range_key       = "agent_status"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.environment == "prod" ? true : false
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-agents"
    FeatureArea = "AgentBuilder"
    Phase       = "2"
  })
}

# Agent Versions Table - Version control for agents
resource "aws_dynamodb_table" "agent_versions" {
  count        = local.deploy_agent_builder ? 1 : 0
  name         = "${local.name_prefix}-agent-versions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "agent_id"
  range_key    = "version"

  attribute {
    name = "agent_id"
    type = "S"
  }

  attribute {
    name = "version"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "created_by"
    type = "S"
  }

  # GSI for versions by creation time
  global_secondary_index {
    name            = "created-at-index"
    hash_key        = "agent_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI for versions by creator
  global_secondary_index {
    name            = "creator-index"
    hash_key        = "created_by"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-agent-versions"
    FeatureArea = "AgentBuilder"
    Phase       = "2"
  })
}

# Agent Flows Table - Visual flow definitions (nodes, edges, canvas)
resource "aws_dynamodb_table" "agent_flows" {
  count        = local.deploy_agent_builder ? 1 : 0
  name         = "${local.name_prefix}-agent-flows"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "agent_id"
  range_key    = "version"

  attribute {
    name = "agent_id"
    type = "S"
  }

  attribute {
    name = "version"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  # GSI for flows by update time
  global_secondary_index {
    name            = "updated-at-index"
    hash_key        = "agent_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-agent-flows"
    FeatureArea = "AgentBuilder"
    Phase       = "2"
  })
}

# Flow Templates Table - Reusable flow templates
resource "aws_dynamodb_table" "flow_templates" {
  count        = local.deploy_agent_builder ? 1 : 0
  name         = "${local.name_prefix}-flow-templates"
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
    name = "visibility"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  attribute {
    name = "created_by"
    type = "S"
  }

  # GSI for templates by category
  global_secondary_index {
    name            = "category-updated-index"
    hash_key        = "category"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for templates by visibility
  global_secondary_index {
    name            = "visibility-updated-index"
    hash_key        = "visibility"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for user's created templates
  global_secondary_index {
    name            = "creator-updated-index"
    hash_key        = "created_by"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-flow-templates"
    FeatureArea = "AgentBuilder"
    Phase       = "2"
  })
}

# Prompts Library Table - Reusable prompts and templates
resource "aws_dynamodb_table" "prompts_library" {
  count        = local.deploy_agent_builder ? 1 : 0
  name         = "${local.name_prefix}-prompts-library"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "prompt_id"

  attribute {
    name = "prompt_id"
    type = "S"
  }

  attribute {
    name = "owner_user_id"
    type = "S"
  }

  attribute {
    name = "organization_id"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  attribute {
    name = "tag"
    type = "S"
  }

  # GSI for user's prompts
  global_secondary_index {
    name            = "owner-updated-index"
    hash_key        = "owner_user_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for organization prompts
  global_secondary_index {
    name            = "organization-updated-index"
    hash_key        = "organization_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for prompts by tag (sparse index)
  global_secondary_index {
    name            = "tag-updated-index"
    hash_key        = "tag"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-prompts-library"
    FeatureArea = "AgentBuilder"
    Phase       = "2"
  })
}

# ================================================================================
# OUTPUT VALUES FOR DEPLOYED TABLES
# ================================================================================

# Project Management Outputs
output "projects_table_arn" {
  description = "ARN of the projects table"
  value       = local.deploy_project_management ? aws_dynamodb_table.projects[0].arn : null
}

output "workspaces_table_arn" {
  description = "ARN of the workspaces table"
  value       = local.deploy_project_management ? aws_dynamodb_table.workspaces[0].arn : null
}

# Agent Builder Outputs
output "agents_table_arn" {
  description = "ARN of the agents table"
  value       = local.deploy_agent_builder ? aws_dynamodb_table.agents[0].arn : null
}

output "agent_flows_table_arn" {
  description = "ARN of the agent flows table"
  value       = local.deploy_agent_builder ? aws_dynamodb_table.agent_flows[0].arn : null
}

# Feature deployment status
output "deployed_features" {
  description = "Status of feature deployments"
  value = {
    project_management = local.deploy_project_management
    agent_builder      = local.deploy_agent_builder
    ai_lab            = local.deploy_ai_lab
    community         = local.deploy_community
    education         = local.deploy_education
    analytics         = local.deploy_analytics
    notifications     = local.deploy_notifications
    enhanced_rbac     = local.deploy_enhanced_rbac
  }
}

# Deployment instructions
output "deployment_instructions" {
  description = "Instructions for enabling feature areas"
  value = <<-EOT
    To deploy feature areas, update the feature flags in locals block:
    
    PHASE 1 - Project Management:
      Set: deploy_project_management = true
      Tables: projects, workspaces, project-memberships, workspace-memberships
    
    PHASE 2 - Agent Builder (Toolset):
      Set: deploy_agent_builder = true  
      Tables: agents, agent-versions, agent-flows, flow-templates, prompts-library
    
    Next phases will be added as needed:
    - Phase 3: AI Lab (models, datasets, experiments)
    - Phase 4: Community Platform (posts, comments, groups)
    - Phase 5: Education Center (courses, lessons, quizzes)
    - Phase 6: Analytics & Observatory
    - Phase 7: Enhanced RBAC & Notifications
    
    Run: terraform plan && terraform apply
  EOT
}
