# ================================================================================
# AI NEXUS WORKBENCH - COMPREHENSIVE DYNAMODB SCHEMA
# ================================================================================
# This file defines all DynamoDB tables needed for the complete AI Nexus Workbench
# including Projects, Agents, Experiments, Community, Education, Notifications, etc.
#
# Architecture Notes:
# - Multi-tenant isolation via organization_id and user_id prefixes
# - Composite keys for time-ordered queries (created_at/updated_at sort keys)
# - GSIs for common access patterns and cross-entity relationships
# - Item sizes kept under 400KB (large objects stored in S3 with references)
# - Sparse GSIs for filtered queries (e.g., unread notifications)
# ================================================================================

# ================================================================================
# CORE PROJECT MANAGEMENT TABLES
# ================================================================================

# Projects Table - Central project management
resource "aws_dynamodb_table" "projects" {
  name           = "${local.resource_prefix}-projects"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "project_id"

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

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-projects"
    Type = "ProjectManagement"
  })
}

# Project Memberships Table - User project roles and permissions
resource "aws_dynamodb_table" "project_memberships" {
  name           = "${local.resource_prefix}-project-memberships"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "project_id"
  range_key      = "user_id"

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

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-project-memberships"
    Type = "ProjectManagement"
  })
}

# Workspaces Table - Higher-level project organization
resource "aws_dynamodb_table" "workspaces" {
  name           = "${local.resource_prefix}-workspaces"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "workspace_id"

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

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-workspaces"
    Type = "ProjectManagement"
  })
}

# Workspace Memberships Table
resource "aws_dynamodb_table" "workspace_memberships" {
  name           = "${local.resource_prefix}-workspace-memberships"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "workspace_id"
  range_key      = "user_id"

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

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-workspace-memberships"
    Type = "ProjectManagement"
  })
}

# ================================================================================
# AGENT BUILDER INFRASTRUCTURE
# ================================================================================

# Agents Table - AI agent definitions
resource "aws_dynamodb_table" "agents" {
  name           = "${local.resource_prefix}-agents"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "agent_id"

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

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-agents"
    Type = "AgentBuilder"
  })
}

# Agent Versions Table - Version control for agents
resource "aws_dynamodb_table" "agent_versions" {
  name           = "${local.resource_prefix}-agent-versions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "agent_id"
  range_key      = "version"

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

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-agent-versions"
    Type = "AgentBuilder"
  })
}

# Agent Flows Table - Visual flow definitions (nodes, edges, canvas)
resource "aws_dynamodb_table" "agent_flows" {
  name           = "${local.resource_prefix}-agent-flows"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "agent_id"
  range_key      = "version"

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

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-agent-flows"
    Type = "AgentBuilder"
  })
}

# Flow Templates Table - Reusable flow templates
resource "aws_dynamodb_table" "flow_templates" {
  name           = "${local.resource_prefix}-flow-templates"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "template_id"

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

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-flow-templates"
    Type = "AgentBuilder"
  })
}

# Prompts Library Table - Reusable prompts and templates
resource "aws_dynamodb_table" "prompts_library" {
  name           = "${local.resource_prefix}-prompts-library"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "prompt_id"

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

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-prompts-library"
    Type = "AgentBuilder"
  })
}

# ================================================================================
# LAB/EXPERIMENT MANAGEMENT SYSTEM
# ================================================================================

# Models Table - ML model registry
resource "aws_dynamodb_table" "models" {
  name           = "${local.resource_prefix}-models"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "model_id"

  attribute {
    name = "model_id"
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
    name = "model_type"
    type = "S"
  }

  # GSI for user's models
  global_secondary_index {
    name            = "owner-updated-index"
    hash_key        = "owner_user_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for organization models
  global_secondary_index {
    name            = "organization-updated-index"
    hash_key        = "organization_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for models by type
  global_secondary_index {
    name            = "organization-type-index"
    hash_key        = "organization_id"
    range_key       = "model_type"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-models"
    Type = "Lab"
  })
}

# Datasets Table - Dataset registry
resource "aws_dynamodb_table" "datasets" {
  name           = "${local.resource_prefix}-datasets"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "dataset_id"

  attribute {
    name = "dataset_id"
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
    name = "dataset_type"
    type = "S"
  }

  # GSI for user's datasets
  global_secondary_index {
    name            = "owner-updated-index"
    hash_key        = "owner_user_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for organization datasets
  global_secondary_index {
    name            = "organization-updated-index"
    hash_key        = "organization_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for datasets by type
  global_secondary_index {
    name            = "organization-type-index"
    hash_key        = "organization_id"
    range_key       = "dataset_type"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-datasets"
    Type = "Lab"
  })
}

# Experiments Table - ML experiment definitions
resource "aws_dynamodb_table" "experiments" {
  name           = "${local.resource_prefix}-experiments"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "experiment_id"

  attribute {
    name = "experiment_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "project_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "experiment_status"
    type = "S"
  }

  # GSI for user's experiments
  global_secondary_index {
    name            = "user-created-index"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI for project experiments
  global_secondary_index {
    name            = "project-created-index"
    hash_key        = "project_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI for experiments by status
  global_secondary_index {
    name            = "user-status-index"
    hash_key        = "user_id"
    range_key       = "experiment_status"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-experiments"
    Type = "Lab"
  })
}

# Experiment Runs Table - Individual experiment executions
resource "aws_dynamodb_table" "experiment_runs" {
  name           = "${local.resource_prefix}-experiment-runs"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "experiment_id"
  range_key      = "run_id"

  attribute {
    name = "experiment_id"
    type = "S"
  }

  attribute {
    name = "run_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "run_status"
    type = "S"
  }

  # GSI for runs by creation time
  global_secondary_index {
    name            = "created-at-index"
    hash_key        = "experiment_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI for runs by status
  global_secondary_index {
    name            = "experiment-status-index"
    hash_key        = "experiment_id"
    range_key       = "run_status"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-experiment-runs"
    Type = "Lab"
  })
}

# Metrics Timeseries Table - Experiment metrics and logs
resource "aws_dynamodb_table" "metrics_timeseries" {
  name           = "${local.resource_prefix}-metrics-timeseries"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "run_id"
  range_key      = "timestamp"

  attribute {
    name = "run_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  attribute {
    name = "metric_name"
    type = "S"
  }

  # GSI for metrics by name and time (sparse index)
  global_secondary_index {
    name            = "metric-time-index"
    hash_key        = "metric_name"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-metrics-timeseries"
    Type = "Lab"
  })
}

# ================================================================================
# COMMUNITY PLATFORM TABLES
# ================================================================================

# Community Posts Table - User posts and discussions
resource "aws_dynamodb_table" "community_posts" {
  name           = "${local.resource_prefix}-community-posts"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "post_id"

  attribute {
    name = "post_id"
    type = "S"
  }

  attribute {
    name = "author_user_id"
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

  attribute {
    name = "topic"
    type = "S"
  }

  attribute {
    name = "trending_score"
    type = "N"
  }

  # GSI for user's posts
  global_secondary_index {
    name            = "author-created-index"
    hash_key        = "author_user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI for organization posts
  global_secondary_index {
    name            = "organization-created-index"
    hash_key        = "organization_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI for posts by topic
  global_secondary_index {
    name            = "topic-created-index"
    hash_key        = "topic"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI for trending posts
  global_secondary_index {
    name            = "organization-trending-index"
    hash_key        = "organization_id"
    range_key       = "trending_score"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-community-posts"
    Type = "Community"
  })
}

# Community Comments Table - Post comments and replies
resource "aws_dynamodb_table" "community_comments" {
  name           = "${local.resource_prefix}-community-comments"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "post_id"
  range_key      = "comment_id"

  attribute {
    name = "post_id"
    type = "S"
  }

  attribute {
    name = "comment_id"
    type = "S"
  }

  attribute {
    name = "author_user_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  # GSI for user's comments
  global_secondary_index {
    name            = "author-created-index"
    hash_key        = "author_user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-community-comments"
    Type = "Community"
  })
}

# Reactions Table - Likes, dislikes, and other reactions
resource "aws_dynamodb_table" "reactions" {
  name           = "${local.resource_prefix}-reactions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "entity_id"
  range_key      = "user_id"

  attribute {
    name = "entity_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "reaction_type"
    type = "S"
  }

  # GSI for reaction counts by type
  global_secondary_index {
    name            = "entity-type-index"
    hash_key        = "entity_id"
    range_key       = "reaction_type"
    projection_type = "ALL"
  }

  # GSI for user's reactions
  global_secondary_index {
    name            = "user-entity-index"
    hash_key        = "user_id"
    range_key       = "entity_id"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-reactions"
    Type = "Community"
  })
}

# Groups Table - Community groups and topics
resource "aws_dynamodb_table" "groups" {
  name           = "${local.resource_prefix}-groups"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "group_id"

  attribute {
    name = "group_id"
    type = "S"
  }

  attribute {
    name = "organization_id"
    type = "S"
  }

  attribute {
    name = "visibility"
    type = "S"
  }

  attribute {
    name = "topic"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  # GSI for organization groups
  global_secondary_index {
    name            = "organization-updated-index"
    hash_key        = "organization_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for groups by visibility
  global_secondary_index {
    name            = "visibility-updated-index"
    hash_key        = "visibility"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for groups by topic
  global_secondary_index {
    name            = "topic-updated-index"
    hash_key        = "topic"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-groups"
    Type = "Community"
  })
}

# Group Memberships Table - User group participation
resource "aws_dynamodb_table" "group_memberships" {
  name           = "${local.resource_prefix}-group-memberships"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "group_id"
  range_key      = "user_id"

  attribute {
    name = "group_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "group_role"
    type = "S"
  }

  attribute {
    name = "joined_at"
    type = "S"
  }

  # GSI for user's group memberships
  global_secondary_index {
    name            = "user-role-index"
    hash_key        = "user_id"
    range_key       = "group_role"
    projection_type = "ALL"
  }

  # GSI for group memberships by join time
  global_secondary_index {
    name            = "group-joined-index"
    hash_key        = "group_id"
    range_key       = "joined_at"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-group-memberships"
    Type = "Community"
  })
}

# ================================================================================
# EDUCATION SYSTEM INFRASTRUCTURE
# ================================================================================

# Courses Table - Educational course catalog
resource "aws_dynamodb_table" "courses" {
  name           = "${local.resource_prefix}-courses"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "course_id"

  attribute {
    name = "course_id"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  attribute {
    name = "visibility"
    type = "S"
  }

  attribute {
    name = "difficulty_level"
    type = "S"
  }

  # GSI for courses by category
  global_secondary_index {
    name            = "category-updated-index"
    hash_key        = "category"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for courses by visibility
  global_secondary_index {
    name            = "visibility-updated-index"
    hash_key        = "visibility"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # GSI for courses by difficulty
  global_secondary_index {
    name            = "category-difficulty-index"
    hash_key        = "category"
    range_key       = "difficulty_level"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-courses"
    Type = "Education"
  })
}

# Lessons Table - Individual course lessons
resource "aws_dynamodb_table" "lessons" {
  name           = "${local.resource_prefix}-lessons"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "course_id"
  range_key      = "lesson_id"

  attribute {
    name = "course_id"
    type = "S"
  }

  attribute {
    name = "lesson_id"
    type = "S"
  }

  attribute {
    name = "order_idx"
    type = "N"
  }

  # GSI for lessons by order
  global_secondary_index {
    name            = "course-order-index"
    hash_key        = "course_id"
    range_key       = "order_idx"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-lessons"
    Type = "Education"
  })
}

# Enrollments Table - User course enrollments
resource "aws_dynamodb_table" "enrollments" {
  name           = "${local.resource_prefix}-enrollments"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "course_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "course_id"
    type = "S"
  }

  attribute {
    name = "enrolled_at"
    type = "S"
  }

  attribute {
    name = "enrollment_status"
    type = "S"
  }

  # GSI for course enrollments
  global_secondary_index {
    name            = "course-enrolled-index"
    hash_key        = "course_id"
    range_key       = "enrolled_at"
    projection_type = "ALL"
  }

  # GSI for user enrollments by status
  global_secondary_index {
    name            = "user-status-index"
    hash_key        = "user_id"
    range_key       = "enrollment_status"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-enrollments"
    Type = "Education"
  })
}

# Lesson Progress Table - User lesson completion tracking
resource "aws_dynamodb_table" "lesson_progress" {
  name           = "${local.resource_prefix}-lesson-progress"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "course_lesson_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "course_lesson_id"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "S"
  }

  # GSI for recent progress updates
  global_secondary_index {
    name            = "user-updated-index"
    hash_key        = "user_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-lesson-progress"
    Type = "Education"
  })
}

# Quizzes Table - Course quizzes and assessments
resource "aws_dynamodb_table" "quizzes" {
  name           = "${local.resource_prefix}-quizzes"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "quiz_id"

  attribute {
    name = "quiz_id"
    type = "S"
  }

  attribute {
    name = "course_id"
    type = "S"
  }

  attribute {
    name = "lesson_id"
    type = "S"
  }

  # GSI for course quizzes
  global_secondary_index {
    name            = "course-lesson-index"
    hash_key        = "course_id"
    range_key       = "lesson_id"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-quizzes"
    Type = "Education"
  })
}

# Quiz Results Table - User quiz submissions and scores
resource "aws_dynamodb_table" "quiz_results" {
  name           = "${local.resource_prefix}-quiz-results"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "quiz_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "quiz_id"
    type = "S"
  }

  attribute {
    name = "submitted_at"
    type = "S"
  }

  # GSI for quiz submissions by time
  global_secondary_index {
    name            = "user-submitted-index"
    hash_key        = "user_id"
    range_key       = "submitted_at"
    projection_type = "ALL"
  }

  # GSI for quiz results
  global_secondary_index {
    name            = "quiz-submitted-index"
    hash_key        = "quiz_id"
    range_key       = "submitted_at"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-quiz-results"
    Type = "Education"
  })
}

# ================================================================================
# NOTIFICATION SYSTEM
# ================================================================================

# Notifications Table - User notifications
resource "aws_dynamodb_table" "notifications" {
  name           = "${local.resource_prefix}-notifications"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "notification_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "notification_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "is_read"
    type = "S"
  }

  attribute {
    name = "notification_type"
    type = "S"
  }

  # GSI for notifications by creation time
  global_secondary_index {
    name            = "user-created-index"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI for unread notifications (sparse index)
  global_secondary_index {
    name            = "user-unread-index"
    hash_key        = "user_id"
    range_key       = "is_read"
    projection_type = "ALL"
  }

  # GSI for notifications by type
  global_secondary_index {
    name            = "user-type-index"
    hash_key        = "user_id"
    range_key       = "notification_type"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-notifications"
    Type = "Notifications"
  })
}

# Notification Subscriptions Table - User notification preferences
resource "aws_dynamodb_table" "notification_subscriptions" {
  name           = "${local.resource_prefix}-notification-subscriptions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "channel"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "channel"
    type = "S"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-notification-subscriptions"
    Type = "Notifications"
  })
}

# ================================================================================
# ANALYTICS AND OBSERVATORY INFRASTRUCTURE
# ================================================================================

# Activity Feed Table - Normalized activity events across the platform
resource "aws_dynamodb_table" "activity_feed" {
  name           = "${local.resource_prefix}-activity-feed"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "entity_id"
  range_key      = "timestamp"

  attribute {
    name = "entity_id"
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
    name = "organization_id"
    type = "S"
  }

  attribute {
    name = "activity_type"
    type = "S"
  }

  # GSI for user activity feed
  global_secondary_index {
    name            = "user-timestamp-index"
    hash_key        = "user_id"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  # GSI for organization activity feed
  global_secondary_index {
    name            = "organization-timestamp-index"
    hash_key        = "organization_id"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  # GSI for activity by type
  global_secondary_index {
    name            = "organization-type-index"
    hash_key        = "organization_id"
    range_key       = "activity_type"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-activity-feed"
    Type = "Analytics"
  })
}

# Aggregated Analytics Table - Pre-computed metrics for dashboards
resource "aws_dynamodb_table" "aggregated_analytics" {
  name           = "${local.resource_prefix}-aggregated-analytics"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "metric_name"
  range_key      = "date_dimension"

  attribute {
    name = "metric_name"
    type = "S"
  }

  attribute {
    name = "date_dimension"
    type = "S"
  }

  attribute {
    name = "organization_id"
    type = "S"
  }

  # GSI for organization metrics
  global_secondary_index {
    name            = "organization-date-index"
    hash_key        = "organization_id"
    range_key       = "date_dimension"
    projection_type = "ALL"
  }

  # TTL for data retention (30 days for raw analytics)
  ttl {
    attribute_name = "ttl_timestamp"
    enabled        = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-aggregated-analytics"
    Type = "Analytics"
  })
}

# ================================================================================
# ENHANCED RBAC AND ORGANIZATION MANAGEMENT
# ================================================================================

# Organization Memberships Table - Complete org membership with roles
resource "aws_dynamodb_table" "organization_memberships" {
  name           = "${local.resource_prefix}-organization-memberships"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "organization_id"
  range_key      = "user_id"

  attribute {
    name = "organization_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "org_role"
    type = "S"
  }

  attribute {
    name = "joined_at"
    type = "S"
  }

  # GSI for user's organization memberships
  global_secondary_index {
    name            = "user-role-index"
    hash_key        = "user_id"
    range_key       = "org_role"
    projection_type = "ALL"
  }

  # GSI for organization members by role
  global_secondary_index {
    name            = "organization-role-index"
    hash_key        = "organization_id"
    range_key       = "org_role"
    projection_type = "ALL"
  }

  # GSI for memberships by join time
  global_secondary_index {
    name            = "organization-joined-index"
    hash_key        = "organization_id"
    range_key       = "joined_at"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-organization-memberships"
    Type = "RBAC"
  })
}

# Role Permissions Table - Role-based permission assignments
resource "aws_dynamodb_table" "role_permissions" {
  name           = "${local.resource_prefix}-role-permissions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "role_name"
  range_key      = "permission_key"

  attribute {
    name = "role_name"
    type = "S"
  }

  attribute {
    name = "permission_key"
    type = "S"
  }

  attribute {
    name = "resource_type"
    type = "S"
  }

  # GSI for permissions by resource type
  global_secondary_index {
    name            = "role-resource-index"
    hash_key        = "role_name"
    range_key       = "resource_type"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-role-permissions"
    Type = "RBAC"
  })
}

# ================================================================================
# OUTPUT VALUES FOR REFERENCE
# ================================================================================

# Core Project Management Table ARNs
output "projects_table_arn" {
  description = "ARN of the projects table"
  value       = aws_dynamodb_table.projects.arn
}

output "project_memberships_table_arn" {
  description = "ARN of the project memberships table"
  value       = aws_dynamodb_table.project_memberships.arn
}

output "workspaces_table_arn" {
  description = "ARN of the workspaces table"
  value       = aws_dynamodb_table.workspaces.arn
}

# Agent Builder Table ARNs
output "agents_table_arn" {
  description = "ARN of the agents table"
  value       = aws_dynamodb_table.agents.arn
}

output "agent_versions_table_arn" {
  description = "ARN of the agent versions table"
  value       = aws_dynamodb_table.agent_versions.arn
}

output "agent_flows_table_arn" {
  description = "ARN of the agent flows table"
  value       = aws_dynamodb_table.agent_flows.arn
}

# Lab/Experiment Table ARNs
output "models_table_arn" {
  description = "ARN of the models table"
  value       = aws_dynamodb_table.models.arn
}

output "datasets_table_arn" {
  description = "ARN of the datasets table"
  value       = aws_dynamodb_table.datasets.arn
}

output "experiments_table_arn" {
  description = "ARN of the experiments table"
  value       = aws_dynamodb_table.experiments.arn
}

output "experiment_runs_table_arn" {
  description = "ARN of the experiment runs table"
  value       = aws_dynamodb_table.experiment_runs.arn
}

# Community Table ARNs
output "community_posts_table_arn" {
  description = "ARN of the community posts table"
  value       = aws_dynamodb_table.community_posts.arn
}

output "community_comments_table_arn" {
  description = "ARN of the community comments table"
  value       = aws_dynamodb_table.community_comments.arn
}

# Education Table ARNs
output "courses_table_arn" {
  description = "ARN of the courses table"
  value       = aws_dynamodb_table.courses.arn
}

output "enrollments_table_arn" {
  description = "ARN of the enrollments table"
  value       = aws_dynamodb_table.enrollments.arn
}

# Notification Table ARNs
output "notifications_table_arn" {
  description = "ARN of the notifications table"
  value       = aws_dynamodb_table.notifications.arn
}

# Analytics Table ARNs
output "activity_feed_table_arn" {
  description = "ARN of the activity feed table"
  value       = aws_dynamodb_table.activity_feed.arn
}

output "aggregated_analytics_table_arn" {
  description = "ARN of the aggregated analytics table"
  value       = aws_dynamodb_table.aggregated_analytics.arn
}

# RBAC Table ARNs
output "organization_memberships_table_arn" {
  description = "ARN of the organization memberships table"
  value       = aws_dynamodb_table.organization_memberships.arn
}

output "role_permissions_table_arn" {
  description = "ARN of the role permissions table"  
  value       = aws_dynamodb_table.role_permissions.arn
}

# Table Names for Lambda Environment Variables
output "dynamodb_table_names" {
  description = "Map of all DynamoDB table names for Lambda environment variables"
  value = {
    # Core Project Management
    PROJECTS_TABLE                    = aws_dynamodb_table.projects.name
    PROJECT_MEMBERSHIPS_TABLE         = aws_dynamodb_table.project_memberships.name
    WORKSPACES_TABLE                  = aws_dynamodb_table.workspaces.name
    WORKSPACE_MEMBERSHIPS_TABLE       = aws_dynamodb_table.workspace_memberships.name
    
    # Agent Builder
    AGENTS_TABLE                      = aws_dynamodb_table.agents.name
    AGENT_VERSIONS_TABLE              = aws_dynamodb_table.agent_versions.name
    AGENT_FLOWS_TABLE                 = aws_dynamodb_table.agent_flows.name
    FLOW_TEMPLATES_TABLE              = aws_dynamodb_table.flow_templates.name
    PROMPTS_LIBRARY_TABLE             = aws_dynamodb_table.prompts_library.name
    
    # Lab/Experiments
    MODELS_TABLE                      = aws_dynamodb_table.models.name
    DATASETS_TABLE                    = aws_dynamodb_table.datasets.name
    EXPERIMENTS_TABLE                 = aws_dynamodb_table.experiments.name
    EXPERIMENT_RUNS_TABLE             = aws_dynamodb_table.experiment_runs.name
    METRICS_TIMESERIES_TABLE          = aws_dynamodb_table.metrics_timeseries.name
    
    # Community
    COMMUNITY_POSTS_TABLE             = aws_dynamodb_table.community_posts.name
    COMMUNITY_COMMENTS_TABLE          = aws_dynamodb_table.community_comments.name
    REACTIONS_TABLE                   = aws_dynamodb_table.reactions.name
    GROUPS_TABLE                      = aws_dynamodb_table.groups.name
    GROUP_MEMBERSHIPS_TABLE           = aws_dynamodb_table.group_memberships.name
    
    # Education
    COURSES_TABLE                     = aws_dynamodb_table.courses.name
    LESSONS_TABLE                     = aws_dynamodb_table.lessons.name
    ENROLLMENTS_TABLE                 = aws_dynamodb_table.enrollments.name
    LESSON_PROGRESS_TABLE             = aws_dynamodb_table.lesson_progress.name
    QUIZZES_TABLE                     = aws_dynamodb_table.quizzes.name
    QUIZ_RESULTS_TABLE                = aws_dynamodb_table.quiz_results.name
    
    # Notifications
    NOTIFICATIONS_TABLE               = aws_dynamodb_table.notifications.name
    NOTIFICATION_SUBSCRIPTIONS_TABLE  = aws_dynamodb_table.notification_subscriptions.name
    
    # Analytics
    ACTIVITY_FEED_TABLE               = aws_dynamodb_table.activity_feed.name
    AGGREGATED_ANALYTICS_TABLE        = aws_dynamodb_table.aggregated_analytics.name
    
    # RBAC
    ORGANIZATION_MEMBERSHIPS_TABLE    = aws_dynamodb_table.organization_memberships.name
    ROLE_PERMISSIONS_TABLE            = aws_dynamodb_table.role_permissions.name
    
    # Existing tables (already implemented)
    USER_PROFILES_TABLE               = "${local.resource_prefix}-user-profiles"
    USER_SESSIONS_TABLE               = "${local.resource_prefix}-user-sessions"
    USER_CONTENT_METADATA_TABLE       = "${local.resource_prefix}-user-content-metadata"
    APPLICATION_SETTINGS_TABLE        = "${local.resource_prefix}-application-settings"
    ORGANIZATION_DATA_TABLE           = "${local.resource_prefix}-organization-data"
    SYSTEM_LOGS_TABLE                 = "${local.resource_prefix}-system-logs"
  }
}
