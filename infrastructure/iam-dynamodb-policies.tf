# AI Nexus Workbench - DynamoDB IAM Policies
# Role-based access control policies for DynamoDB resources

# BasicUsers Group Policy - Read-only access to own user data
resource "aws_iam_policy" "basic_users_dynamodb_policy" {
  name        = "${local.name_prefix}-basic-users-dynamodb-policy"
  description = "DynamoDB access policy for BasicUsers group - own data only"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Read own user profile
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.user_profiles.arn,
          "${aws_dynamodb_table.user_profiles.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = ["$${cognito-identity.amazonaws.com:sub}"]
          }
        }
      },
      # Read own user sessions
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.user_sessions.arn,
          "${aws_dynamodb_table.user_sessions.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = ["$${cognito-identity.amazonaws.com:sub}-*"]
          }
        }
      },
      # Read own content metadata
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.user_content_metadata.arn,
          "${aws_dynamodb_table.user_content_metadata.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:Select" = ["ALL_ATTRIBUTES"]
          }
          StringEquals = {
            "dynamodb:Attributes" = [
              "user_id",
              "content_id",
              "content_type",
              "created_at",
              "updated_at",
              "file_path",
              "file_size"
            ]
          }
        }
      },
      # Read application settings (global, read-only)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.application_settings.arn
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = ["public", "user_settings"]
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name      = "${local.name_prefix}-basic-users-dynamodb-policy"
    UserGroup = "BasicUsers"
  })
}

# OrgUsers Group Policy - Extended access within their organization
resource "aws_iam_policy" "org_users_dynamodb_policy" {
  name        = "${local.name_prefix}-org-users-dynamodb-policy"
  description = "DynamoDB access policy for OrgUsers group - organization data access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Full access to own user profile
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.user_profiles.arn,
          "${aws_dynamodb_table.user_profiles.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = ["$${cognito-identity.amazonaws.com:sub}"]
          }
        }
      },
      # Read access to organization user profiles (limited attributes)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Query",
          "dynamodb:GetItem"
        ]
        Resource = [
          aws_dynamodb_table.user_profiles.arn,
          "${aws_dynamodb_table.user_profiles.arn}/index/organization-index"
        ]
        Condition = {
          StringEquals = {
            "dynamodb:Attributes" = [
              "user_id",
              "email",
              "full_name",
              "organization_id",
              "role",
              "created_at"
            ]
          }
          # Organization ID should match user's organization
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = ["$${cognito-identity.amazonaws.com:organization}"]
          }
        }
      },
      # Access to organization data within their org
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.organization_data.arn,
          "${aws_dynamodb_table.organization_data.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = ["$${cognito-identity.amazonaws.com:organization}"]
          }
        }
      },
      # Full access to own sessions
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.user_sessions.arn,
          "${aws_dynamodb_table.user_sessions.arn}/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = ["$${cognito-identity.amazonaws.com:sub}-*"]
          }
        }
      },
      # Access to organization content metadata
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.user_content_metadata.arn,
          "${aws_dynamodb_table.user_content_metadata.arn}/index/organization-content-index"
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = ["$${cognito-identity.amazonaws.com:organization}"]
          }
        }
      },
      # Read/Write access to application settings
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.application_settings.arn
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = ["public", "user_settings", "org_settings"]
          }
        }
      },
      # Read own logs and organization logs
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Query",
          "dynamodb:GetItem"
        ]
        Resource = [
          aws_dynamodb_table.system_logs.arn,
          "${aws_dynamodb_table.system_logs.arn}/index/*"
        ]
        Condition = {
          "ForAnyValue:StringEquals" = {
            "dynamodb:LeadingKeys" = [
              "$${cognito-identity.amazonaws.com:sub}",
              "org_$${cognito-identity.amazonaws.com:organization}"
            ]
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name      = "${local.name_prefix}-org-users-dynamodb-policy"
    UserGroup = "OrgUsers"
  })
}

# Development Group Policy - Broader access for development activities
resource "aws_iam_policy" "development_dynamodb_policy" {
  name        = "${local.name_prefix}-development-dynamodb-policy"
  description = "DynamoDB access policy for Development group - enhanced access for development"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Full access to user profiles (with some restrictions)
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
          aws_dynamodb_table.user_profiles.arn,
          "${aws_dynamodb_table.user_profiles.arn}/index/*"
        ]
        # Restrict sensitive operations to dev/staging environments
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
          StringLike = {
            "aws:userid" = "*:dev-*"
          }
        }
      },
      # Full access to organization data
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
          aws_dynamodb_table.organization_data.arn,
          "${aws_dynamodb_table.organization_data.arn}/index/*"
        ]
      },
      # Full access to user sessions
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.user_sessions.arn,
          "${aws_dynamodb_table.user_sessions.arn}/index/*"
        ]
      },
      # Full access to content metadata
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.user_content_metadata.arn,
          "${aws_dynamodb_table.user_content_metadata.arn}/index/*"
        ]
      },
      # Full access to application settings
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.application_settings.arn,
          "${aws_dynamodb_table.application_settings.arn}/index/*"
        ]
      },
      # Read access to system logs
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Query",
          "dynamodb:GetItem",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.system_logs.arn,
          "${aws_dynamodb_table.system_logs.arn}/index/*"
        ]
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name      = "${local.name_prefix}-development-dynamodb-policy"
    UserGroup = "Development"
  })
}

# Testing Group Policy - Similar to development with additional testing permissions
resource "aws_iam_policy" "testing_dynamodb_policy" {
  name        = "${local.name_prefix}-testing-dynamodb-policy"
  description = "DynamoDB access policy for Testing group - testing and QA access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Full access to all tables for testing purposes
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.user_profiles.arn,
          "${aws_dynamodb_table.user_profiles.arn}/index/*",
          aws_dynamodb_table.organization_data.arn,
          "${aws_dynamodb_table.organization_data.arn}/index/*",
          aws_dynamodb_table.user_sessions.arn,
          "${aws_dynamodb_table.user_sessions.arn}/index/*",
          aws_dynamodb_table.user_content_metadata.arn,
          "${aws_dynamodb_table.user_content_metadata.arn}/index/*",
          aws_dynamodb_table.application_settings.arn,
          "${aws_dynamodb_table.application_settings.arn}/index/*",
          aws_dynamodb_table.system_logs.arn,
          "${aws_dynamodb_table.system_logs.arn}/index/*"
        ]
        # Restrict to non-production environments
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
          StringNotEquals = {
            "aws:PrincipalTag/Environment" = "prod"
          }
        }
      },
      # Additional testing permissions
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:DescribeBackup",
          "dynamodb:ListBackups"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name      = "${local.name_prefix}-testing-dynamodb-policy"
    UserGroup = "Testing"
  })
}

# S3 Access Policies for user content

# BasicUsers S3 Policy - Access to own content only
resource "aws_iam_policy" "basic_users_s3_policy" {
  name        = "${local.name_prefix}-basic-users-s3-policy"
  description = "S3 access policy for BasicUsers group - own content only"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # List own folder only
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.user_content.arn
        Condition = {
          StringLike = {
            "s3:prefix" = ["users/$${cognito-identity.amazonaws.com:sub}/*"]
          }
        }
      },
      # Read/Write to own folder
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.user_content.arn}/users/$${cognito-identity.amazonaws.com:sub}/*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name      = "${local.name_prefix}-basic-users-s3-policy"
    UserGroup = "BasicUsers"
  })
}

# OrgUsers S3 Policy - Access to organization content
resource "aws_iam_policy" "org_users_s3_policy" {
  name        = "${local.name_prefix}-org-users-s3-policy"
  description = "S3 access policy for OrgUsers group - organization content access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # List own folder and organization folder
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.user_content.arn
        Condition = {
          StringLike = {
            "s3:prefix" = [
              "users/$${cognito-identity.amazonaws.com:sub}/*",
              "organizations/$${cognito-identity.amazonaws.com:organization}/*"
            ]
          }
        }
      },
      # Read/Write to own folder
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.user_content.arn}/users/$${cognito-identity.amazonaws.com:sub}/*"
      },
      # Read/Write to organization folder
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.user_content.arn}/organizations/$${cognito-identity.amazonaws.com:organization}/*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name      = "${local.name_prefix}-org-users-s3-policy"
    UserGroup = "OrgUsers"
  })
}

# Development and Testing S3 Policies (broader access)
resource "aws_iam_policy" "dev_testing_s3_policy" {
  name        = "${local.name_prefix}-dev-testing-s3-policy"
  description = "S3 access policy for Development and Testing groups"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Full access to user content bucket for dev/testing
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:GetBucketVersioning"
        ]
        Resource = aws_s3_bucket.user_content.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:RestoreObject"
        ]
        Resource = "${aws_s3_bucket.user_content.arn}/*"
        # Restrict to non-production
        Condition = {
          StringNotEquals = {
            "aws:PrincipalTag/Environment" = "prod"
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name      = "${local.name_prefix}-dev-testing-s3-policy"
    UserGroup = "Development-Testing"
  })
}

# Attach policies to the respective Cognito Identity Pool roles
resource "aws_iam_role_policy_attachment" "basic_users_dynamodb" {
  role       = aws_iam_role.cognito_basic_users_role.name
  policy_arn = aws_iam_policy.basic_users_dynamodb_policy.arn
}

resource "aws_iam_role_policy_attachment" "basic_users_s3" {
  role       = aws_iam_role.cognito_basic_users_role.name
  policy_arn = aws_iam_policy.basic_users_s3_policy.arn
}

resource "aws_iam_role_policy_attachment" "org_users_dynamodb" {
  role       = aws_iam_role.cognito_org_users_role.name
  policy_arn = aws_iam_policy.org_users_dynamodb_policy.arn
}

resource "aws_iam_role_policy_attachment" "org_users_s3" {
  role       = aws_iam_role.cognito_org_users_role.name
  policy_arn = aws_iam_policy.org_users_s3_policy.arn
}

resource "aws_iam_role_policy_attachment" "development_dynamodb" {
  role       = aws_iam_role.cognito_development_role.name
  policy_arn = aws_iam_policy.development_dynamodb_policy.arn
}

resource "aws_iam_role_policy_attachment" "development_s3" {
  role       = aws_iam_role.cognito_development_role.name
  policy_arn = aws_iam_policy.dev_testing_s3_policy.arn
}

resource "aws_iam_role_policy_attachment" "testing_dynamodb" {
  role       = aws_iam_role.cognito_testing_role.name
  policy_arn = aws_iam_policy.testing_dynamodb_policy.arn
}

resource "aws_iam_role_policy_attachment" "testing_s3" {
  role       = aws_iam_role.cognito_testing_role.name
  policy_arn = aws_iam_policy.dev_testing_s3_policy.arn
}

# Lambda execution policies for DynamoDB access (for user management functions)
resource "aws_iam_policy" "lambda_dynamodb_access" {
  name        = "${local.name_prefix}-lambda-dynamodb-access"
  description = "DynamoDB access policy for Lambda functions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          # Core tables
          aws_dynamodb_table.user_profiles.arn,
          "${aws_dynamodb_table.user_profiles.arn}/index/*",
          aws_dynamodb_table.organization_data.arn,
          "${aws_dynamodb_table.organization_data.arn}/index/*",
          aws_dynamodb_table.user_sessions.arn,
          "${aws_dynamodb_table.user_sessions.arn}/index/*",
          aws_dynamodb_table.user_content_metadata.arn,
          "${aws_dynamodb_table.user_content_metadata.arn}/index/*",
          aws_dynamodb_table.application_settings.arn,
          "${aws_dynamodb_table.application_settings.arn}/index/*",
          aws_dynamodb_table.system_logs.arn,
          "${aws_dynamodb_table.system_logs.arn}/index/*",
          # AI Lab and Toolset extensions
          aws_dynamodb_table.agent_templates.arn,
          "${aws_dynamodb_table.agent_templates.arn}/index/*",
          aws_dynamodb_table.agent_execution_history.arn,
          "${aws_dynamodb_table.agent_execution_history.arn}/index/*",
          aws_dynamodb_table.experiment_run_logs.arn,
          "${aws_dynamodb_table.experiment_run_logs.arn}/index/*",
          aws_dynamodb_table.flow_node_configs.arn,
          "${aws_dynamodb_table.flow_node_configs.arn}/index/*",
          aws_dynamodb_table.lab_model_registry.arn,
          "${aws_dynamodb_table.lab_model_registry.arn}/index/*"
        ]
      },
      # Allow Lambda to access Cognito for user management
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminRemoveUserFromGroup",
          "cognito-idp:ListUsersInGroup"
        ]
        Resource = [
          aws_cognito_user_pool.main.arn
        ]
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-lambda-dynamodb-access"
    Purpose = "Lambda function database access"
  })
}

# Outputs
output "basic_users_dynamodb_policy_arn" {
  description = "ARN of the BasicUsers DynamoDB policy"
  value       = aws_iam_policy.basic_users_dynamodb_policy.arn
}

output "org_users_dynamodb_policy_arn" {
  description = "ARN of the OrgUsers DynamoDB policy"
  value       = aws_iam_policy.org_users_dynamodb_policy.arn
}

output "lambda_dynamodb_access_policy_arn" {
  description = "ARN of the Lambda DynamoDB access policy"
  value       = aws_iam_policy.lambda_dynamodb_access.arn
}
