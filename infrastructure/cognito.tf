# AI Nexus Workbench - AWS Cognito Infrastructure
# This file creates the complete Cognito setup with user groups for role-based access control

# Variables for cognito-specific configuration
variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "ai-nexus-workbench"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "workbench.diatonic.ai"
}

# Local values for consistent naming
locals {
  # Use the main project naming from variables
  cognito_name_prefix = "${var.project_name}-${var.environment}"

  # Cognito configuration
  cognito_domain = "${var.project_name}-${var.environment}-auth"

  # User group definitions aligned with our permission system
  cognito_user_groups = {
    BasicUsers = {
      description = "Basic authenticated users with standard access"
      precedence  = 10
      role_arn    = aws_iam_role.cognito_basic_users_role.arn
    }
    OrgUsers = {
      description = "Organization members with enhanced access"
      precedence  = 5
      role_arn    = aws_iam_role.cognito_org_users_role.arn
    }
    Development = {
      description = "Development team with full system access"
      precedence  = 2
      role_arn    = aws_iam_role.cognito_development_role.arn
    }
    Testing = {
      description = "QA testing team with comprehensive access"
      precedence  = 1
      role_arn    = aws_iam_role.cognito_testing_role.arn
    }
  }

  # Cognito-specific tags
  cognito_common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Service     = "ai-nexus-workbench"
  }
}

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${local.cognito_name_prefix}-user-pool"

  # User attributes configuration
  alias_attributes         = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  # User pool add-ons
  user_pool_add_ons {
    advanced_security_mode = var.environment == "prod" ? "ENFORCED" : "AUDIT"
  }

  # Username configuration
  username_configuration {
    case_sensitive = false
  }

  # Schema for custom user attributes
  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "email"
    required                 = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "given_name"
    required                 = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "family_name"
    required                 = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "organization"
    required                 = false

    string_attribute_constraints {
      min_length = 0
      max_length = 256
    }
  }

  # Account recovery settings
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Admin create user config
  admin_create_user_config {
    allow_admin_create_user_only = false

    invite_message_template {
      email_message = "Hello {username}! Welcome to AI Nexus Workbench! Your temporary password is {####}. Please sign in and change your password."
      email_subject = "Welcome to AI Nexus Workbench"
      sms_message   = "Hello {username}! Welcome to AI Nexus Workbench! Your temporary password is {####}"
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Verification message templates
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_message        = "Your verification code for AI Nexus Workbench is {####}"
    email_subject        = "Verify your AI Nexus Workbench account"
  }

  # Lambda triggers for custom flows (commented out for initial deployment)
  # lambda_config {
  #   pre_sign_up         = aws_lambda_function.pre_signup.arn
  #   post_confirmation   = aws_lambda_function.post_confirmation.arn
  #   pre_authentication  = aws_lambda_function.pre_authentication.arn
  #   post_authentication = aws_lambda_function.post_authentication.arn
  # }

  tags = local.cognito_common_tags
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = local.cognito_domain
  user_pool_id = aws_cognito_user_pool.main.id
}

# Cognito User Pool Client for the web application
resource "aws_cognito_user_pool_client" "web_client" {
  name         = "${local.cognito_name_prefix}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # Client configuration
  generate_secret                               = false
  prevent_user_existence_errors                 = "ENABLED"
  enable_token_revocation                       = true
  enable_propagate_additional_user_context_data = false

  # Refresh token configuration
  refresh_token_validity = 30
  access_token_validity  = 60
  id_token_validity      = 60

  token_validity_units {
    refresh_token = "days"
    access_token  = "minutes"
    id_token      = "minutes"
  }

  # OAuth configuration
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile", "aws.cognito.signin.user.admin"]

  # Callback URLs (update these based on your deployment)
  callback_urls = [
    "http://localhost:3000/auth/callback",
    "http://localhost:8080/auth/callback",
    "https://dev.${var.domain_name}/auth/callback",
    "https://staging.${var.domain_name}/auth/callback",
    "https://${var.domain_name}/auth/callback"
  ]

  logout_urls = [
    "http://localhost:3000/",
    "http://localhost:8080/",
    "https://dev.${var.domain_name}/",
    "https://staging.${var.domain_name}/",
    "https://${var.domain_name}/"
  ]

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]

  # Write attributes that the client can update
  write_attributes = [
    "email",
    "given_name",
    "family_name",
    "custom:organization"
  ]

  # Read attributes that the client can read
  read_attributes = [
    "email",
    "email_verified",
    "given_name",
    "family_name",
    "custom:organization"
  ]

  # Explicit auth flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_CUSTOM_AUTH"
  ]
}

# Cognito User Pool Groups for role-based access control
resource "aws_cognito_user_group" "groups" {
  for_each = local.cognito_user_groups

  name         = each.key
  user_pool_id = aws_cognito_user_pool.main.id
  description  = each.value.description
  precedence   = each.value.precedence
  role_arn     = each.value.role_arn
}

# Cognito Identity Pool for AWS service access
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${local.cognito_name_prefix}-identity-pool"
  allow_unauthenticated_identities = false
  allow_classic_flow               = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.web_client.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = true
  }

  tags = local.cognito_common_tags
}

# IAM roles for different user groups

# Basic Users Role
resource "aws_iam_role" "cognito_basic_users_role" {
  name = "${local.cognito_name_prefix}-cognito-basic-users-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
      }
    ]
  })

  tags = local.cognito_common_tags
}

resource "aws_iam_role_policy" "basic_users_policy" {
  name = "${local.cognito_name_prefix}-basic-users-policy"
  role = aws_iam_role.cognito_basic_users_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-sync:*",
          "cognito-identity:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
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
      }
    ]
  })
}

# Organization Users Role
resource "aws_iam_role" "cognito_org_users_role" {
  name = "${local.cognito_name_prefix}-cognito-org-users-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
      }
    ]
  })

  tags = local.cognito_common_tags
}

resource "aws_iam_role_policy" "org_users_policy" {
  name = "${local.cognito_name_prefix}-org-users-policy"
  role = aws_iam_role.cognito_org_users_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-sync:*",
          "cognito-identity:*"
        ]
        Resource = "*"
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
          aws_dynamodb_table.user_profiles.arn,
          aws_dynamodb_table.organization_data.arn,
          "${aws_dynamodb_table.user_profiles.arn}/index/*",
          "${aws_dynamodb_table.organization_data.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.user_content.arn}/org-content/*",
          "${aws_s3_bucket.user_content.arn}/user-content/$${cognito-identity.amazonaws.com:sub}/*"
        ]
      }
    ]
  })
}

# Development Role
resource "aws_iam_role" "cognito_development_role" {
  name = "${local.cognito_name_prefix}-cognito-development-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
      }
    ]
  })

  tags = local.cognito_common_tags
}

resource "aws_iam_role_policy" "development_policy" {
  name = "${local.cognito_name_prefix}-development-policy"
  role = aws_iam_role.cognito_development_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-sync:*",
          "cognito-identity:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:*"
        ]
        Resource = [
          aws_dynamodb_table.user_profiles.arn,
          aws_dynamodb_table.organization_data.arn,
          aws_dynamodb_table.system_logs.arn,
          "${aws_dynamodb_table.user_profiles.arn}/index/*",
          "${aws_dynamodb_table.organization_data.arn}/index/*",
          "${aws_dynamodb_table.system_logs.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:*"
        ]
        Resource = [
          aws_s3_bucket.user_content.arn,
          "${aws_s3_bucket.user_content.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Testing Role (full access for QA)
resource "aws_iam_role" "cognito_testing_role" {
  name = "${local.cognito_name_prefix}-cognito-testing-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
      }
    ]
  })

  tags = local.cognito_common_tags
}

resource "aws_iam_role_policy" "testing_policy" {
  name = "${local.cognito_name_prefix}-testing-policy"
  role = aws_iam_role.cognito_testing_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-sync:*",
          "cognito-identity:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:*"
        ]
        Resource = [
          aws_dynamodb_table.user_profiles.arn,
          aws_dynamodb_table.organization_data.arn,
          aws_dynamodb_table.system_logs.arn,
          "${aws_dynamodb_table.user_profiles.arn}/index/*",
          "${aws_dynamodb_table.organization_data.arn}/index/*",
          "${aws_dynamodb_table.system_logs.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:*"
        ]
        Resource = [
          aws_s3_bucket.user_content.arn,
          "${aws_s3_bucket.user_content.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:*"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Identity Pool Role Attachment
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    "authenticated" = aws_iam_role.cognito_basic_users_role.arn
  }

  role_mapping {
    identity_provider         = "${aws_cognito_user_pool.main.endpoint}:${aws_cognito_user_pool_client.web_client.id}"
    ambiguous_role_resolution = "AuthenticatedRole"
    type                      = "Rules"

    mapping_rule {
      claim      = "cognito:groups"
      match_type = "Contains"
      value      = "BasicUsers"
      role_arn   = aws_iam_role.cognito_basic_users_role.arn
    }

    mapping_rule {
      claim      = "cognito:groups"
      match_type = "Contains"
      value      = "OrgUsers"
      role_arn   = aws_iam_role.cognito_org_users_role.arn
    }

    mapping_rule {
      claim      = "cognito:groups"
      match_type = "Contains"
      value      = "Development"
      role_arn   = aws_iam_role.cognito_development_role.arn
    }

    mapping_rule {
      claim      = "cognito:groups"
      match_type = "Contains"
      value      = "Testing"
      role_arn   = aws_iam_role.cognito_testing_role.arn
    }
  }
}

# Outputs for use in other configurations
output "cognito_user_pool_id" {
  description = "The ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  description = "The ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.web_client.id
}

output "cognito_identity_pool_id" {
  description = "The ID of the Cognito Identity Pool"
  value       = aws_cognito_identity_pool.main.id
}

output "cognito_domain" {
  description = "The Cognito domain for hosted UI"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "cognito_user_pool_arn" {
  description = "The ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.arn
}

output "user_groups" {
  description = "The created user groups"
  value       = { for k, v in aws_cognito_user_group.groups : k => v.name }
}
