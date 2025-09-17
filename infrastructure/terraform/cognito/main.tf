# AI Nexus Workbench - Production Cognito Infrastructure
# Terraform configuration for hardened production authentication

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

# Variables for environment configuration
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "ai-nexus-workbench"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "diatonic.ai"
}

variable "ses_email_address" {
  description = "Verified SES email address for sending auth emails"
  type        = string
}

variable "callback_urls" {
  description = "List of allowed callback URLs"
  type        = list(string)
  default = [
    "http://localhost:3000/auth/callback",
    "http://localhost:8080/auth/callback"
  ]
}

variable "logout_urls" {
  description = "List of allowed logout URLs"
  type        = list(string)
  default = [
    "http://localhost:3000/",
    "http://localhost:8080/"
  ]
}

variable "enable_mfa" {
  description = "Enable MFA for the user pool"
  type        = bool
  default     = false
}

variable "enable_advanced_security" {
  description = "Enable advanced security features"
  type        = bool
  default     = true
}

variable "password_require_symbols" {
  description = "Require symbols in passwords"
  type        = bool
  default     = true
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Random password for testing/seeding
resource "random_password" "admin_temp_password" {
  length  = 16
  special = true
  upper   = true
  lower   = true
  numeric = true
}

# Local values for resource naming and configuration
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  # Environment-specific URLs
  app_urls = var.environment == "prod" ? [
    "https://${var.domain_name}/auth/callback",
    "https://${var.domain_name}/",
  ] : var.environment == "staging" ? [
    "https://staging.${var.domain_name}/auth/callback",
    "https://staging.${var.domain_name}/",
  ] : [
    "https://dev.${var.domain_name}/auth/callback", 
    "https://dev.${var.domain_name}/",
  ]
  
  # Merge environment URLs with provided callback/logout URLs
  all_callback_urls = concat(var.callback_urls, local.app_urls)
  all_logout_urls   = concat(var.logout_urls, local.app_urls)
  
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Component   = "Authentication"
  }
}

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${local.name_prefix}-user-pool"

  # Alias configuration - allow email sign-in
  alias_attributes         = ["email"]
  auto_verified_attributes = ["email"]
  
  # Username configuration
  username_configuration {
    case_sensitive = false
  }

  # Enhanced password policy for production
  password_policy {
    minimum_length                   = var.environment == "prod" ? 12 : 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = var.password_require_symbols
    require_uppercase                = true
    temporary_password_validity_days = 3  # Shorter validity for security
  }

  # MFA configuration
  mfa_configuration = var.enable_mfa ? "OPTIONAL" : "OFF"
  
  dynamic "software_token_mfa_configuration" {
    for_each = var.enable_mfa ? [1] : []
    content {
      enabled = true
    }
  }

  # Advanced security features for production
  user_pool_add_ons {
    advanced_security_mode = var.enable_advanced_security ? "ENFORCED" : "AUDIT"
  }

  # Account recovery - email only for security
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Device configuration
  device_configuration {
    challenge_required_on_new_device      = true
    device_only_remembered_on_user_prompt = true
  }

  # Email configuration - will be updated to use SES
  email_configuration {
    email_sending_account = "DEVELOPER"
    source_arn           = aws_ses_email_identity.auth_email.arn
  }

  # Custom attributes
  schema {
    attribute_data_type = "String"
    name               = "organization"
    mutable            = true
    
    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }
  
  schema {
    attribute_data_type = "String"
    name               = "role"
    mutable            = true
    
    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  # Verification message templates
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "${var.project_name} - Verify your email address"
    email_message        = "Welcome to ${var.project_name}! Your verification code is {####}. This code will expire in 24 hours."
  }

  # Admin create user configuration  
  admin_create_user_config {
    allow_admin_create_user_only = false
    invite_message_template {
      email_subject = "Welcome to ${var.project_name}"
      email_message = "You have been invited to join ${var.project_name}. Your username is {username} and temporary password is {####}. Please sign in and change your password."
    }
  }

  # Lambda triggers for enhanced security and customization
  lambda_config {
    pre_sign_up                    = aws_lambda_function.pre_signup.arn
    post_confirmation             = aws_lambda_function.post_confirmation.arn
    pre_authentication            = aws_lambda_function.pre_authentication.arn
    post_authentication           = aws_lambda_function.post_authentication.arn
    pre_token_generation         = aws_lambda_function.pre_token_generation.arn
    custom_message               = aws_lambda_function.custom_message.arn
  }

  tags = local.common_tags
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${local.name_prefix}-auth"
  user_pool_id = aws_cognito_user_pool.main.id
  
  # For production, consider using a custom domain with ACM certificate
  # certificate_arn = var.environment == "prod" ? aws_acm_certificate.auth_domain[0].arn : null
}

# App Client for the React SPA
resource "aws_cognito_user_pool_client" "web_client" {
  name         = "${local.name_prefix}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # SPA configuration - no client secret
  generate_secret = false

  # Token validity (hardened for production)
  access_token_validity  = var.environment == "prod" ? 15 : 60  # 15 minutes for prod
  id_token_validity     = var.environment == "prod" ? 15 : 60  # 15 minutes for prod  
  refresh_token_validity = 30  # 30 days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # OAuth configuration
  allowed_oauth_flows  = ["code", "implicit"]
  allowed_oauth_scopes = ["openid", "email", "profile", "aws.cognito.signin.user.admin"]
  
  callback_urls        = local.all_callback_urls
  logout_urls         = local.all_logout_urls
  default_redirect_uri = local.app_urls[0]

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]

  # Explicit auth flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH", 
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_CUSTOM_AUTH"
  ]

  # Read/Write attributes
  read_attributes = [
    "email",
    "email_verified", 
    "family_name",
    "given_name",
    "custom:organization",
    "custom:role"
  ]
  
  write_attributes = [
    "email",
    "family_name", 
    "given_name",
    "custom:organization"
  ]

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Auth session validity
  auth_session_validity = 10  # 10 minutes

  depends_on = [aws_cognito_user_pool.main]
}

# Identity Pool for AWS resource access
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${local.name_prefix}-identity-pool"
  allow_unauthenticated_identities = false  # Security: no anonymous access

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.web_client.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = true
  }

  tags = local.common_tags
}

# User Groups with hierarchical precedence
resource "aws_cognito_user_pool_group" "admin" {
  name         = "Administrators"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "System administrators with full access"
  precedence   = 1
  role_arn     = aws_iam_role.admin_role.arn
}

resource "aws_cognito_user_pool_group" "developers" {
  name         = "Developers"  
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Development team members"
  precedence   = 2
  role_arn     = aws_iam_role.developer_role.arn
}

resource "aws_cognito_user_pool_group" "org_users" {
  name         = "OrganizationUsers"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Organization members with enhanced access"
  precedence   = 5
  role_arn     = aws_iam_role.org_user_role.arn
}

resource "aws_cognito_user_pool_group" "basic_users" {
  name         = "BasicUsers"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Standard users with basic access"
  precedence   = 10
  role_arn     = aws_iam_role.basic_user_role.arn
}

# SES Email Identity for auth emails
resource "aws_ses_email_identity" "auth_email" {
  email = var.ses_email_address
}

resource "aws_ses_email_identity_policy" "auth_email_policy" {
  identity = aws_ses_email_identity.auth_email.email
  name     = "${local.name_prefix}-cognito-ses-policy"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cognito-idp.amazonaws.com"
        }
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = aws_ses_email_identity.auth_email.arn
        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.ses_email_address
          }
        }
      }
    ]
  })
}

# Output values for application configuration
output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.web_client.id
}

output "identity_pool_id" {
  description = "Cognito Identity Pool ID"
  value       = aws_cognito_identity_pool.main.id
}

output "user_pool_domain" {
  description = "Cognito User Pool Domain"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "user_pool_endpoint" {
  description = "Cognito User Pool Endpoint"
  value       = aws_cognito_user_pool.main.endpoint
}

output "auth_urls" {
  description = "Authentication URLs for the application"
  value = {
    sign_in_url   = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com/login"
    sign_up_url   = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com/signup"
    sign_out_url  = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com/logout"
  }
}

output "environment_variables" {
  description = "Environment variables for the React application"
  value = {
    VITE_AWS_REGION                     = data.aws_region.current.name
    VITE_AWS_COGNITO_USER_POOL_ID       = aws_cognito_user_pool.main.id
    VITE_AWS_COGNITO_USER_POOL_CLIENT_ID = aws_cognito_user_pool_client.web_client.id
    VITE_AWS_COGNITO_IDENTITY_POOL_ID   = aws_cognito_identity_pool.main.id
    VITE_AWS_COGNITO_DOMAIN             = aws_cognito_user_pool_domain.main.domain
  }
  sensitive = false
}
