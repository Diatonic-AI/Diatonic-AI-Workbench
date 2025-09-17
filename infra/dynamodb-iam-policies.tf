# ================================================================================
# DYNAMODB IAM POLICIES FOR MULTI-TENANT ISOLATION
# ================================================================================
# This file defines IAM policies that enforce multi-tenant isolation for all
# DynamoDB tables in the AI Nexus Workbench. Each Lambda function will have
# access only to the data within their organization/user context.
#
# Security Model:
# - Organization-level isolation via organization_id prefix
# - User-level isolation via user_id prefix
# - LeadingKeys conditions to prevent cross-tenant data access
# - Specific table and index permissions for each Lambda role
# ================================================================================

# ================================================================================
# DYNAMODB ACCESS POLICY - PROJECT MANAGEMENT
# ================================================================================

# Policy for Project Management Lambda functions
resource "aws_iam_policy" "dynamodb_project_management_policy" {
  name        = "${local.resource_prefix}-dynamodb-project-management"
  description = "DynamoDB access policy for project management operations with multi-tenant isolation"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Projects table access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.projects.arn,
          "${aws_dynamodb_table.projects.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*",
              "$${aws:userid}"
            ]
          }
        }
      },
      # Project memberships table access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.project_memberships.arn,
          "${aws_dynamodb_table.project_memberships.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*"
            ]
          }
        }
      },
      # Workspaces table access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.workspaces.arn,
          "${aws_dynamodb_table.workspaces.arn}/index/*",
          aws_dynamodb_table.workspace_memberships.arn,
          "${aws_dynamodb_table.workspace_memberships.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*",
              "$${aws:userid}"
            ]
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

# ================================================================================
# DYNAMODB ACCESS POLICY - AGENT BUILDER
# ================================================================================

# Policy for Agent Builder Lambda functions
resource "aws_iam_policy" "dynamodb_agent_builder_policy" {
  name        = "${local.resource_prefix}-dynamodb-agent-builder"
  description = "DynamoDB access policy for agent builder operations with multi-tenant isolation"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Agents table access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.agents.arn,
          "${aws_dynamodb_table.agents.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*",
              "$${aws:userid}"
            ]
          }
        }
      },
      # Agent versions and flows table access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.agent_versions.arn,
          "${aws_dynamodb_table.agent_versions.arn}/index/*",
          aws_dynamodb_table.agent_flows.arn,
          "${aws_dynamodb_table.agent_flows.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*"
            ]
          }
        }
      },
      # Flow templates table access (shared templates with visibility control)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.flow_templates.arn,
          "${aws_dynamodb_table.flow_templates.arn}/index/*"
        ]
      },
      # User-specific template operations
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.flow_templates.arn
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:Attributes" = [
              "created_by"
            ]
          }
          "StringEquals" = {
            "dynamodb:Attribute:created_by" = "$${aws:userid}"
          }
        }
      },
      # Prompts library table access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.prompts_library.arn,
          "${aws_dynamodb_table.prompts_library.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*",
              "$${aws:userid}"
            ]
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

# ================================================================================
# DYNAMODB ACCESS POLICY - LAB/EXPERIMENTS
# ================================================================================

# Policy for Lab/Experiment Lambda functions
resource "aws_iam_policy" "dynamodb_lab_policy" {
  name        = "${local.resource_prefix}-dynamodb-lab"
  description = "DynamoDB access policy for lab and experiment operations with multi-tenant isolation"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Models and datasets table access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.models.arn,
          "${aws_dynamodb_table.models.arn}/index/*",
          aws_dynamodb_table.datasets.arn,
          "${aws_dynamodb_table.datasets.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*",
              "$${aws:userid}"
            ]
          }
        }
      },
      # Experiments table access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.experiments.arn,
          "${aws_dynamodb_table.experiments.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:userid}"
            ]
          }
        }
      },
      # Experiment runs and metrics table access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.experiment_runs.arn,
          "${aws_dynamodb_table.experiment_runs.arn}/index/*",
          aws_dynamodb_table.metrics_timeseries.arn,
          "${aws_dynamodb_table.metrics_timeseries.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*"
            ]
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

# ================================================================================
# DYNAMODB ACCESS POLICY - COMMUNITY
# ================================================================================

# Policy for Community Lambda functions
resource "aws_iam_policy" "dynamodb_community_policy" {
  name        = "${local.resource_prefix}-dynamodb-community"
  description = "DynamoDB access policy for community operations with multi-tenant isolation"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Community posts table access (read all org posts, write/edit own posts)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.community_posts.arn,
          "${aws_dynamodb_table.community_posts.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*"
            ]
          }
        }
      },
      # User-specific post operations (create/edit/delete own posts)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.community_posts.arn
        ]
        Condition = {
          "StringEquals" = {
            "dynamodb:Attribute:author_user_id" = "$${aws:userid}"
          }
        }
      },
      # Community comments table access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.community_comments.arn,
          "${aws_dynamodb_table.community_comments.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*"
            ]
          }
        }
      },
      # Reactions table access (user can react to org content)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.reactions.arn,
          "${aws_dynamodb_table.reactions.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*",
              "$${aws:userid}"
            ]
          }
        }
      },
      # Groups and group memberships table access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.groups.arn,
          "${aws_dynamodb_table.groups.arn}/index/*",
          aws_dynamodb_table.group_memberships.arn,
          "${aws_dynamodb_table.group_memberships.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*",
              "$${aws:userid}"
            ]
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

# ================================================================================
# DYNAMODB ACCESS POLICY - EDUCATION
# ================================================================================

# Policy for Education Lambda functions
resource "aws_iam_policy" "dynamodb_education_policy" {
  name        = "${local.resource_prefix}-dynamodb-education"
  description = "DynamoDB access policy for education operations with multi-tenant isolation"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Courses and lessons table access (read-only for users, admin write)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.courses.arn,
          "${aws_dynamodb_table.courses.arn}/index/*",
          aws_dynamodb_table.lessons.arn,
          "${aws_dynamodb_table.lessons.arn}/index/*"
        ]
      },
      # Course admin operations (requires admin role)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.courses.arn,
          aws_dynamodb_table.lessons.arn
        ]
        Condition = {
          "StringEquals" = {
            "aws:PrincipalTag/role" = "admin"
          }
        }
      },
      # User enrollments and progress access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.enrollments.arn,
          "${aws_dynamodb_table.enrollments.arn}/index/*",
          aws_dynamodb_table.lesson_progress.arn,
          "${aws_dynamodb_table.lesson_progress.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:userid}"
            ]
          }
        }
      },
      # Quiz access - read quiz definitions, write results
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.quizzes.arn,
          "${aws_dynamodb_table.quizzes.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.quiz_results.arn,
          "${aws_dynamodb_table.quiz_results.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:userid}"
            ]
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

# ================================================================================
# DYNAMODB ACCESS POLICY - NOTIFICATIONS
# ================================================================================

# Policy for Notification Lambda functions
resource "aws_iam_policy" "dynamodb_notifications_policy" {
  name        = "${local.resource_prefix}-dynamodb-notifications"
  description = "DynamoDB access policy for notification operations with user-level isolation"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # User notifications access (user can only access their own notifications)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.notifications.arn,
          "${aws_dynamodb_table.notifications.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:userid}"
            ]
          }
        }
      },
      # Notification subscriptions access (user-specific)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.notification_subscriptions.arn
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:userid}"
            ]
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

# ================================================================================
# DYNAMODB ACCESS POLICY - ANALYTICS
# ================================================================================

# Policy for Analytics Lambda functions
resource "aws_iam_policy" "dynamodb_analytics_policy" {
  name        = "${local.resource_prefix}-dynamodb-analytics"
  description = "DynamoDB access policy for analytics operations with org-level isolation"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Activity feed access (org-level data)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.activity_feed.arn,
          "${aws_dynamodb_table.activity_feed.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*",
              "$${aws:userid}"
            ]
          }
        }
      },
      # Aggregated analytics access (org-level metrics)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.aggregated_analytics.arn,
          "${aws_dynamodb_table.aggregated_analytics.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*"
            ]
          }
        }
      },
      # Read-only access to other tables for analytics computation
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.projects.arn,
          "${aws_dynamodb_table.projects.arn}/index/*",
          aws_dynamodb_table.agents.arn,
          "${aws_dynamodb_table.agents.arn}/index/*",
          aws_dynamodb_table.experiments.arn,
          "${aws_dynamodb_table.experiments.arn}/index/*",
          aws_dynamodb_table.community_posts.arn,
          "${aws_dynamodb_table.community_posts.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*"
            ]
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

# ================================================================================
# DYNAMODB ACCESS POLICY - RBAC/ORGANIZATION MANAGEMENT
# ================================================================================

# Policy for RBAC and Organization Management Lambda functions
resource "aws_iam_policy" "dynamodb_rbac_policy" {
  name        = "${local.resource_prefix}-dynamodb-rbac"
  description = "DynamoDB access policy for RBAC and organization management operations"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Organization memberships access (admin-level operations)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.organization_memberships.arn,
          "${aws_dynamodb_table.organization_memberships.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*"
            ]
          }
        }
      },
      # Role permissions access (system admin only)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.role_permissions.arn,
          "${aws_dynamodb_table.role_permissions.arn}/index/*"
        ]
      },
      # Role permission management (requires system admin role)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.role_permissions.arn
        ]
        Condition = {
          "StringEquals" = {
            "aws:PrincipalTag/role" = "system_admin"
          }
        }
      },
      # Access to existing user profiles and org data tables
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${local.resource_prefix}-user-profiles",
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${local.resource_prefix}-user-profiles/index/*",
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${local.resource_prefix}-organization-data", 
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${local.resource_prefix}-organization-data/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "$${aws:PrincipalTag/organization_id}:*",
              "$${aws:userid}"
            ]
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

# ================================================================================
# LAMBDA EXECUTION ROLES WITH ATTACHED POLICIES
# ================================================================================

# Project Management Lambda Role
resource "aws_iam_role" "lambda_project_management_role" {
  name = "${local.resource_prefix}-lambda-project-management"

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

# Attach policies to Project Management role
resource "aws_iam_role_policy_attachment" "lambda_project_management_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_project_management_role.name
}

resource "aws_iam_role_policy_attachment" "lambda_project_management_dynamodb" {
  policy_arn = aws_iam_policy.dynamodb_project_management_policy.arn
  role       = aws_iam_role.lambda_project_management_role.name
}

# Agent Builder Lambda Role
resource "aws_iam_role" "lambda_agent_builder_role" {
  name = "${local.resource_prefix}-lambda-agent-builder"

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

resource "aws_iam_role_policy_attachment" "lambda_agent_builder_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_agent_builder_role.name
}

resource "aws_iam_role_policy_attachment" "lambda_agent_builder_dynamodb" {
  policy_arn = aws_iam_policy.dynamodb_agent_builder_policy.arn
  role       = aws_iam_role.lambda_agent_builder_role.name
}

# Lab Lambda Role
resource "aws_iam_role" "lambda_lab_role" {
  name = "${local.resource_prefix}-lambda-lab"

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

resource "aws_iam_role_policy_attachment" "lambda_lab_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_lab_role.name
}

resource "aws_iam_role_policy_attachment" "lambda_lab_dynamodb" {
  policy_arn = aws_iam_policy.dynamodb_lab_policy.arn
  role       = aws_iam_role.lambda_lab_role.name
}

# Community Lambda Role
resource "aws_iam_role" "lambda_community_role" {
  name = "${local.resource_prefix}-lambda-community"

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

resource "aws_iam_role_policy_attachment" "lambda_community_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_community_role.name
}

resource "aws_iam_role_policy_attachment" "lambda_community_dynamodb" {
  policy_arn = aws_iam_policy.dynamodb_community_policy.arn
  role       = aws_iam_role.lambda_community_role.name
}

# Education Lambda Role
resource "aws_iam_role" "lambda_education_role" {
  name = "${local.resource_prefix}-lambda-education"

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

resource "aws_iam_role_policy_attachment" "lambda_education_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_education_role.name
}

resource "aws_iam_role_policy_attachment" "lambda_education_dynamodb" {
  policy_arn = aws_iam_policy.dynamodb_education_policy.arn
  role       = aws_iam_role.lambda_education_role.name
}

# Notifications Lambda Role
resource "aws_iam_role" "lambda_notifications_role" {
  name = "${local.resource_prefix}-lambda-notifications"

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

resource "aws_iam_role_policy_attachment" "lambda_notifications_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_notifications_role.name
}

resource "aws_iam_role_policy_attachment" "lambda_notifications_dynamodb" {
  policy_arn = aws_iam_policy.dynamodb_notifications_policy.arn
  role       = aws_iam_role.lambda_notifications_role.name
}

# Analytics Lambda Role
resource "aws_iam_role" "lambda_analytics_role" {
  name = "${local.resource_prefix}-lambda-analytics"

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

resource "aws_iam_role_policy_attachment" "lambda_analytics_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_analytics_role.name
}

resource "aws_iam_role_policy_attachment" "lambda_analytics_dynamodb" {
  policy_arn = aws_iam_policy.dynamodb_analytics_policy.arn
  role       = aws_iam_role.lambda_analytics_role.name
}

# RBAC Lambda Role
resource "aws_iam_role" "lambda_rbac_role" {
  name = "${local.resource_prefix}-lambda-rbac"

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

resource "aws_iam_role_policy_attachment" "lambda_rbac_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_rbac_role.name
}

resource "aws_iam_role_policy_attachment" "lambda_rbac_dynamodb" {
  policy_arn = aws_iam_policy.dynamodb_rbac_policy.arn
  role       = aws_iam_role.lambda_rbac_role.name
}

# ================================================================================
# OUTPUTS FOR LAMBDA ROLE ARNS
# ================================================================================

output "lambda_execution_role_arns" {
  description = "ARNs of Lambda execution roles for each service"
  value = {
    project_management = aws_iam_role.lambda_project_management_role.arn
    agent_builder      = aws_iam_role.lambda_agent_builder_role.arn
    lab                = aws_iam_role.lambda_lab_role.arn
    community          = aws_iam_role.lambda_community_role.arn
    education          = aws_iam_role.lambda_education_role.arn
    notifications      = aws_iam_role.lambda_notifications_role.arn
    analytics          = aws_iam_role.lambda_analytics_role.arn
    rbac               = aws_iam_role.lambda_rbac_role.arn
  }
}

