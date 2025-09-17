# Lambda Functions for Cognito Triggers
# Provides enhanced security, customization, and monitoring

# Lambda execution role
resource "aws_iam_role" "lambda_execution_role" {
  name = "${local.name_prefix}-cognito-lambda-role"
  
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

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_cognito_policy" {
  name = "${local.name_prefix}-lambda-cognito-policy"
  role = aws_iam_role.lambda_execution_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:ListUsers"
        ]
        Resource = aws_cognito_user_pool.main.arn
      }
    ]
  })
}

# Pre Sign-up Lambda - Enhanced validation and security
resource "aws_lambda_function" "pre_signup" {
  filename         = "lambda/pre_signup.zip"
  function_name    = "${local.name_prefix}-pre-signup"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  runtime         = "python3.11"
  timeout         = 30
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
      ALLOWED_DOMAINS = var.environment == "prod" ? "diatonic.ai" : "*"
    }
  }
  
  tags = local.common_tags
  
  depends_on = [data.archive_file.pre_signup_zip]
}

# Lambda source code for pre-signup
data "archive_file" "pre_signup_zip" {
  type        = "zip"
  output_path = "lambda/pre_signup.zip"
  source {
    content = <<EOF
import json
import re
import os

def handler(event, context):
    print(f"Pre-signup trigger: {json.dumps(event, default=str)}")
    
    # Get user attributes
    user_attributes = event.get('request', {}).get('userAttributes', {})
    email = user_attributes.get('email', '').lower()
    
    # Environment configuration
    environment = os.environ.get('ENVIRONMENT', 'dev')
    allowed_domains = os.environ.get('ALLOWED_DOMAINS', '*')
    
    # Email validation
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise Exception("Invalid email address format")
    
    # Domain restriction for production
    if environment == 'prod' and allowed_domains != '*':
        allowed_domain_list = [d.strip() for d in allowed_domains.split(',')]
        email_domain = email.split('@')[1] if '@' in email else ''
        
        if email_domain not in allowed_domain_list:
            raise Exception(f"Email domain {email_domain} is not allowed")
    
    # Block suspicious email patterns
    suspicious_patterns = [
        r'\d{10,}',  # Too many consecutive digits
        r'test.*test',  # Test accounts
        r'temp.*temp',  # Temporary accounts
    ]
    
    for pattern in suspicious_patterns:
        if re.search(pattern, email, re.IGNORECASE):
            print(f"Blocked suspicious email pattern: {email}")
            raise Exception("Email address not allowed")
    
    # Auto-confirm email for development
    if environment in ['dev', 'staging']:
        event['response']['autoConfirmUser'] = True
        event['response']['autoVerifyEmail'] = True
    
    # Set custom attributes
    if 'organization' not in user_attributes:
        event['response']['userAttributes'] = event['response'].get('userAttributes', {})
        event['response']['userAttributes']['custom:organization'] = 'Individual'
    
    print(f"Pre-signup validation passed for: {email}")
    return event

EOF
    filename = "index.py"
  }
}

# Post Confirmation Lambda - User onboarding
resource "aws_lambda_function" "post_confirmation" {
  filename         = "lambda/post_confirmation.zip"
  function_name    = "${local.name_prefix}-post-confirmation"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  runtime         = "python3.11"
  timeout         = 30
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
      USER_POOL_ID = aws_cognito_user_pool.main.id
    }
  }
  
  tags = local.common_tags
  
  depends_on = [data.archive_file.post_confirmation_zip]
}

data "archive_file" "post_confirmation_zip" {
  type        = "zip"
  output_path = "lambda/post_confirmation.zip"
  source {
    content = <<EOF
import json
import boto3
import os
from datetime import datetime

def handler(event, context):
    print(f"Post-confirmation trigger: {json.dumps(event, default=str)}")
    
    # Initialize Cognito client
    cognito_client = boto3.client('cognito-idp')
    user_pool_id = os.environ.get('USER_POOL_ID')
    
    # Get user information
    username = event.get('userName')
    user_attributes = event.get('request', {}).get('userAttributes', {})
    
    try:
        # Update user attributes with confirmation timestamp
        attributes_to_update = [
            {
                'Name': 'custom:confirmed_at',
                'Value': datetime.utcnow().isoformat()
            }
        ]
        
        # Set default role if not specified
        if 'custom:role' not in user_attributes:
            attributes_to_update.append({
                'Name': 'custom:role',
                'Value': 'BasicUser'
            })
        
        # Add user to BasicUsers group by default
        try:
            cognito_client.admin_add_user_to_group(
                UserPoolId=user_pool_id,
                Username=username,
                GroupName='BasicUsers'
            )
            print(f"Added user {username} to BasicUsers group")
        except Exception as e:
            print(f"Error adding user to group: {str(e)}")
        
        # Update user attributes
        if attributes_to_update:
            cognito_client.admin_update_user_attributes(
                UserPoolId=user_pool_id,
                Username=username,
                UserAttributes=attributes_to_update
            )
        
        print(f"Post-confirmation processing completed for user: {username}")
        
    except Exception as e:
        print(f"Error in post-confirmation processing: {str(e)}")
        # Don't raise exception to avoid blocking user confirmation
    
    return event

EOF
    filename = "index.py"
  }
}

# Pre Authentication Lambda - Security checks
resource "aws_lambda_function" "pre_authentication" {
  filename         = "lambda/pre_authentication.zip"
  function_name    = "${local.name_prefix}-pre-authentication"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  runtime         = "python3.11"
  timeout         = 30
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
    }
  }
  
  tags = local.common_tags
  
  depends_on = [data.archive_file.pre_authentication_zip]
}

data "archive_file" "pre_authentication_zip" {
  type        = "zip"
  output_path = "lambda/pre_authentication.zip"
  source {
    content = <<EOF
import json
import os
from datetime import datetime, timezone

def handler(event, context):
    print(f"Pre-authentication trigger: {json.dumps(event, default=str)}")
    
    # Get user attributes and request info
    user_attributes = event.get('request', {}).get('userAttributes', {})
    username = event.get('userName')
    
    # Security checks
    try:
        # Check if user is confirmed
        email_verified = user_attributes.get('email_verified', 'false').lower()
        if email_verified != 'true':
            print(f"Authentication blocked: email not verified for {username}")
            raise Exception("Email must be verified before authentication")
        
        # Rate limiting could be implemented here with DynamoDB
        # For now, just log the authentication attempt
        print(f"Authentication attempt for user: {username} at {datetime.now(timezone.utc).isoformat()}")
        
        # Additional security checks can be added here:
        # - IP-based restrictions
        # - Device fingerprinting
        # - Time-based access controls
        # - Geographic restrictions
        
    except Exception as e:
        print(f"Pre-authentication check failed: {str(e)}")
        raise e
    
    return event

EOF
    filename = "index.py"
  }
}

# Post Authentication Lambda - Logging and metrics
resource "aws_lambda_function" "post_authentication" {
  filename         = "lambda/post_authentication.zip"
  function_name    = "${local.name_prefix}-post-authentication"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  runtime         = "python3.11"
  timeout         = 30
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
    }
  }
  
  tags = local.common_tags
  
  depends_on = [data.archive_file.post_authentication_zip]
}

data "archive_file" "post_authentication_zip" {
  type        = "zip"
  output_path = "lambda/post_authentication.zip"
  source {
    content = <<EOF
import json
import os
from datetime import datetime, timezone

def handler(event, context):
    print(f"Post-authentication trigger: {json.dumps(event, default=str)}")
    
    # Get user information
    username = event.get('userName')
    user_attributes = event.get('request', {}).get('userAttributes', {})
    
    # Log successful authentication
    auth_info = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'username': username,
        'email': user_attributes.get('email'),
        'organization': user_attributes.get('custom:organization'),
        'role': user_attributes.get('custom:role', 'BasicUser')
    }
    
    print(f"Successful authentication: {json.dumps(auth_info)}")
    
    # Here you could:
    # - Send metrics to CloudWatch
    # - Update user's last_login timestamp
    # - Send notification for first-time logins
    # - Update analytics/reporting systems
    
    return event

EOF
    filename = "index.py"
  }
}

# Pre Token Generation Lambda - Custom claims
resource "aws_lambda_function" "pre_token_generation" {
  filename         = "lambda/pre_token_generation.zip"
  function_name    = "${local.name_prefix}-pre-token-generation"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  runtime         = "python3.11"
  timeout         = 30
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
    }
  }
  
  tags = local.common_tags
  
  depends_on = [data.archive_file.pre_token_generation_zip]
}

data "archive_file" "pre_token_generation_zip" {
  type        = "zip"
  output_path = "lambda/pre_token_generation.zip"
  source {
    content = <<EOF
import json
import os

def handler(event, context):
    print(f"Pre-token generation trigger: {json.dumps(event, default=str)}")
    
    # Get user attributes
    user_attributes = event.get('request', {}).get('userAttributes', {})
    username = event.get('userName')
    
    # Add custom claims to the token
    claims_to_add = {}
    claims_to_override = {}
    
    # Add organization to token
    if 'custom:organization' in user_attributes:
        claims_to_add['organization'] = user_attributes['custom:organization']
    
    # Add role to token for fine-grained access control
    if 'custom:role' in user_attributes:
        claims_to_add['role'] = user_attributes['custom:role']
    else:
        claims_to_add['role'] = 'BasicUser'
    
    # Add environment context
    claims_to_add['environment'] = os.environ.get('ENVIRONMENT', 'dev')
    claims_to_add['app'] = os.environ.get('PROJECT_NAME', 'ai-nexus-workbench')
    
    # For production, you might want to add:
    # - Permissions array based on role
    # - Tenant ID for multi-tenancy
    # - Feature flags
    # - Subscription level
    
    # Set the claims
    if claims_to_add:
        event['response']['claimsOverrideDetails'] = {
            'claimsToAddOrOverride': claims_to_add
        }
        if claims_to_override:
            event['response']['claimsOverrideDetails']['claimsToSuppress'] = list(claims_to_override.keys())
    
    print(f"Token generation completed for user: {username}")
    return event

EOF
    filename = "index.py"
  }
}

# Custom Message Lambda - Branded emails
resource "aws_lambda_function" "custom_message" {
  filename         = "lambda/custom_message.zip"
  function_name    = "${local.name_prefix}-custom-message"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  runtime         = "python3.11"
  timeout         = 30
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
      DOMAIN_NAME = var.domain_name
    }
  }
  
  tags = local.common_tags
  
  depends_on = [data.archive_file.custom_message_zip]
}

data "archive_file" "custom_message_zip" {
  type        = "zip"
  output_path = "lambda/custom_message.zip"
  source {
    content = <<EOF
import json
import os

def handler(event, context):
    print(f"Custom message trigger: {json.dumps(event, default=str)}")
    
    # Get trigger source and user attributes
    trigger_source = event.get('triggerSource')
    user_attributes = event.get('request', {}).get('userAttributes', {})
    username = event.get('userName')
    
    project_name = os.environ.get('PROJECT_NAME', 'AI Nexus Workbench')
    domain_name = os.environ.get('DOMAIN_NAME', 'diatonic.ai')
    
    # Customize messages based on trigger source
    if trigger_source == 'CustomMessage_SignUp':
        # Email verification message
        event['response']['emailSubject'] = f"Welcome to {project_name} - Verify your email"
        event['response']['emailMessage'] = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Welcome to {project_name}!</h2>
        
        <p>Hello {user_attributes.get('given_name', 'there')},</p>
        
        <p>Thank you for signing up for {project_name}. To complete your registration, please verify your email address by using the verification code below:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; color: #2563eb; font-size: 32px; letter-spacing: 4px;">{{####}}</h3>
        </div>
        
        <p>This verification code will expire in 24 hours. If you didn't create this account, please ignore this email.</p>
        
        <p>Best regards,<br>
        The {project_name} Team</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280;">
            This email was sent to {user_attributes.get('email', '')}. 
            Visit us at <a href="https://{domain_name}">{domain_name}</a>
        </p>
    </div>
</body>
</html>
"""
    
    elif trigger_source == 'CustomMessage_AdminCreateUser':
        # Admin invitation message
        event['response']['emailSubject'] = f"You're invited to join {project_name}"
        event['response']['emailMessage'] = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">You're invited to {project_name}!</h2>
        
        <p>Hello {user_attributes.get('given_name', 'there')},</p>
        
        <p>You've been invited to join {project_name}. Your account has been created with the following details:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Username:</strong> {{username}}</p>
            <p><strong>Temporary Password:</strong> {{####}}</p>
        </div>
        
        <p>Please sign in using these credentials and change your password on first login.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://{domain_name}/signin" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
               Sign In to {project_name}
            </a>
        </div>
        
        <p>Best regards,<br>
        The {project_name} Team</p>
    </div>
</body>
</html>
"""
    
    elif trigger_source == 'CustomMessage_ForgotPassword':
        # Password reset message
        event['response']['emailSubject'] = f"{project_name} - Password Reset"
        event['response']['emailMessage'] = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        
        <p>Hello {user_attributes.get('given_name', 'there')},</p>
        
        <p>You've requested to reset your password for {project_name}. Use the verification code below to proceed:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; color: #2563eb; font-size: 32px; letter-spacing: 4px;">{{####}}</h3>
        </div>
        
        <p>This code will expire in 1 hour. If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
        
        <p>Best regards,<br>
        The {project_name} Team</p>
    </div>
</body>
</html>
"""
    
    print(f"Custom message generated for trigger: {trigger_source}")
    return event

EOF
    filename = "index.py"
  }
}

# Lambda permissions for Cognito to invoke functions
resource "aws_lambda_permission" "cognito_pre_signup" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_signup.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_lambda_permission" "cognito_post_confirmation" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post_confirmation.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_lambda_permission" "cognito_pre_authentication" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_authentication.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_lambda_permission" "cognito_post_authentication" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post_authentication.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_lambda_permission" "cognito_pre_token_generation" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_token_generation.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_lambda_permission" "cognito_custom_message" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.custom_message.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

# Output Lambda function ARNs
output "lambda_functions" {
  description = "Lambda function ARNs for Cognito triggers"
  value = {
    pre_signup         = aws_lambda_function.pre_signup.arn
    post_confirmation  = aws_lambda_function.post_confirmation.arn
    pre_authentication = aws_lambda_function.pre_authentication.arn
    post_authentication = aws_lambda_function.post_authentication.arn
    pre_token_generation = aws_lambda_function.pre_token_generation.arn
    custom_message     = aws_lambda_function.custom_message.arn
  }
}
