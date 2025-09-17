# IAM Roles for Cognito Identity Pool and User Groups
# Provides least-privilege access based on user group membership

# Basic assume role policy for Cognito authenticated users
data "aws_iam_policy_document" "cognito_assume_role" {
  statement {
    effect = "Allow"
    
    principals {
      type        = "Federated"
      identifiers = ["cognito-identity.amazonaws.com"]
    }
    
    actions = ["sts:AssumeRoleWithWebIdentity"]
    
    condition {
      test     = "StringEquals"
      variable = "cognito-identity.amazonaws.com:aud"
      values   = [aws_cognito_identity_pool.main.id]
    }
  }
}

# Admin Role - Full system access for administrators
resource "aws_iam_role" "admin_role" {
  name               = "${local.name_prefix}-cognito-admin-role"
  assume_role_policy = data.aws_iam_policy_document.cognito_assume_role.json
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cognito-admin-role"
    Role = "Administrator"
  })
}

resource "aws_iam_role_policy" "admin_policy" {
  name = "${local.name_prefix}-admin-policy"
  role = aws_iam_role.admin_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          # S3 access for application data
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${local.name_prefix}-*",
          "arn:aws:s3:::${local.name_prefix}-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          # DynamoDB access for application data
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
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${local.name_prefix}-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          # API Gateway access
          "execute-api:Invoke"
        ]
        Resource = [
          "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          # Lambda invoke for admin functions
          "lambda:InvokeFunction"
        ]
        Resource = [
          "arn:aws:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:${local.name_prefix}-admin-*"
        ]
      }
    ]
  })
}

# Developer Role - Development and testing access
resource "aws_iam_role" "developer_role" {
  name               = "${local.name_prefix}-cognito-developer-role"
  assume_role_policy = data.aws_iam_policy_document.cognito_assume_role.json
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cognito-developer-role"
    Role = "Developer"
  })
}

resource "aws_iam_role_policy" "developer_policy" {
  name = "${local.name_prefix}-developer-policy"
  role = aws_iam_role.developer_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          # S3 access for development resources
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${local.name_prefix}-dev-*",
          "arn:aws:s3:::${local.name_prefix}-dev-*/*",
          "arn:aws:s3:::${local.name_prefix}-staging-*",
          "arn:aws:s3:::${local.name_prefix}-staging-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          # DynamoDB read/write for development
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${local.name_prefix}-dev-*",
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${local.name_prefix}-staging-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          # API Gateway development access
          "execute-api:Invoke"
        ]
        Resource = [
          "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*/dev/*",
          "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*/staging/*"
        ]
      }
    ]
  })
}

# Organization Users Role - Enhanced access for org members
resource "aws_iam_role" "org_user_role" {
  name               = "${local.name_prefix}-cognito-org-user-role"
  assume_role_policy = data.aws_iam_policy_document.cognito_assume_role.json
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cognito-org-user-role"
    Role = "OrganizationUser"
  })
}

resource "aws_iam_role_policy" "org_user_policy" {
  name = "${local.name_prefix}-org-user-policy"
  role = aws_iam_role.org_user_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          # S3 access for user-specific data
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "arn:aws:s3:::${local.name_prefix}-user-data/*/$${cognito-identity.amazonaws.com:sub}/*",
          "arn:aws:s3:::${local.name_prefix}-shared/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          # DynamoDB access for user data
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = [
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${local.name_prefix}-user-data"
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = ["$${cognito-identity.amazonaws.com:sub}"]
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          # API Gateway user access
          "execute-api:Invoke"
        ]
        Resource = [
          "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*/prod/user/*",
          "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*/prod/org/*"
        ]
      }
    ]
  })
}

# Basic Users Role - Standard access for regular users
resource "aws_iam_role" "basic_user_role" {
  name               = "${local.name_prefix}-cognito-basic-user-role"
  assume_role_policy = data.aws_iam_policy_document.cognito_assume_role.json
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cognito-basic-user-role"  
    Role = "BasicUser"
  })
}

resource "aws_iam_role_policy" "basic_user_policy" {
  name = "${local.name_prefix}-basic-user-policy"
  role = aws_iam_role.basic_user_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          # S3 access for personal user data only
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "arn:aws:s3:::${local.name_prefix}-user-data/$${cognito-identity.amazonaws.com:sub}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          # DynamoDB access for personal user data
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = [
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${local.name_prefix}-user-data"
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = ["$${cognito-identity.amazonaws.com:sub}"]
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          # API Gateway basic user access
          "execute-api:Invoke"
        ]
        Resource = [
          "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*/prod/user/*"
        ]
      }
    ]
  })
}

# Identity Pool Role Mappings
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id
  
  # Role mappings based on user group membership
  role_mapping {
    identity_provider         = aws_cognito_user_pool.main.endpoint
    ambiguous_role_resolution = "AuthenticatedRole"
    type                      = "Rules"
    
    mapping_rule {
      claim      = "custom:role"
      match_type = "Equals"
      role_arn   = aws_iam_role.admin_role.arn
      value      = "Administrator"
    }
    
    mapping_rule {
      claim      = "custom:role"
      match_type = "Equals"
      role_arn   = aws_iam_role.developer_role.arn
      value      = "Developer"
    }
    
    mapping_rule {
      claim      = "custom:role"
      match_type = "Equals"
      role_arn   = aws_iam_role.org_user_role.arn
      value      = "OrganizationUser"
    }
    
    mapping_rule {
      claim      = "custom:role"
      match_type = "Equals"
      role_arn   = aws_iam_role.basic_user_role.arn
      value      = "BasicUser"
    }
  }
  
  # Default authenticated role (fallback)
  roles = {
    "authenticated" = aws_iam_role.basic_user_role.arn
  }
}

# Output IAM role ARNs
output "iam_roles" {
  description = "IAM roles for different user groups"
  value = {
    admin_role     = aws_iam_role.admin_role.arn
    developer_role = aws_iam_role.developer_role.arn
    org_user_role  = aws_iam_role.org_user_role.arn
    basic_user_role = aws_iam_role.basic_user_role.arn
  }
}
