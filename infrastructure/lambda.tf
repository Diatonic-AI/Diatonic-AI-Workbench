# AI Nexus Workbench - Lambda Functions
# User management, authentication, and role assignment functions

# Lambda execution role
resource "aws_iam_role" "lambda_execution_role" {
  name = "${local.name_prefix}-lambda-execution-role"

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

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-lambda-execution-role"
    Purpose = "Lambda function execution"
  })
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach DynamoDB access policy
resource "aws_iam_role_policy_attachment" "lambda_dynamodb_access" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.lambda_dynamodb_access.arn
}

# Lambda layer for shared dependencies (boto3, etc.)
data "archive_file" "lambda_layer_zip" {
  type        = "zip"
  output_path = "${path.module}/lambda_layer.zip"

  source {
    content = jsonencode({
      python_version = "3.9",
      dependencies   = ["boto3", "botocore", "uuid", "datetime", "json"]
    })
    filename = "requirements.json"
  }
}

resource "aws_lambda_layer_version" "shared_layer" {
  filename         = data.archive_file.lambda_layer_zip.output_path
  layer_name       = "${local.name_prefix}-shared-layer"
  source_code_hash = data.archive_file.lambda_layer_zip.output_base64sha256

  compatible_runtimes = ["python3.9", "python3.10", "python3.11"]
  description         = "Shared dependencies for AI Nexus Workbench Lambda functions"

  lifecycle {
    create_before_destroy = true
  }
}

# User Registration Lambda Function
data "archive_file" "user_registration_zip" {
  type        = "zip"
  output_path = "${path.module}/user_registration.zip"

  source {
    content  = <<EOF
import json
import boto3
import uuid
from datetime import datetime, timezone
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
cognito_idp = boto3.client('cognito-idp')

# Environment variables
USER_POOL_ID = '${aws_cognito_user_pool.main.id}'
USER_PROFILES_TABLE = '${aws_dynamodb_table.user_profiles.name}'
SYSTEM_LOGS_TABLE = '${aws_dynamodb_table.system_logs.name}'

def lambda_handler(event, context):
    """
    Handle user registration requests
    Creates user in Cognito and stores profile in DynamoDB
    """
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        # Validate required fields
        required_fields = ['email', 'password', 'full_name']
        for field in required_fields:
            if not body.get(field):
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS'
                    },
                    'body': json.dumps({
                        'error': f'Missing required field: {field}'
                    })
                }
        
        email = body['email'].lower().strip()
        password = body['password']
        full_name = body['full_name'].strip()
        organization_id = body.get('organization_id', 'individual')
        role = body.get('role', 'basic')
        
        # Generate user ID
        user_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Create user in Cognito
        try:
            cognito_response = cognito_idp.admin_create_user(
                UserPoolId=USER_POOL_ID,
                Username=email,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'email_verified', 'Value': 'true'},
                    {'Name': 'custom:user_id', 'Value': user_id},
                    {'Name': 'custom:full_name', 'Value': full_name},
                    {'Name': 'custom:organization_id', 'Value': organization_id},
                    {'Name': 'custom:role', 'Value': role}
                ],
                TemporaryPassword=password,
                MessageAction='SUPPRESS'
            )
            
            # Set permanent password
            cognito_idp.admin_set_user_password(
                UserPoolId=USER_POOL_ID,
                Username=email,
                Password=password,
                Permanent=True
            )
            
            # Add user to appropriate group
            group_name = get_cognito_group(role, organization_id)
            if group_name:
                try:
                    cognito_idp.admin_add_user_to_group(
                        UserPoolId=USER_POOL_ID,
                        Username=email,
                        GroupName=group_name
                    )
                    logger.info(f"Added user {email} to group {group_name}")
                except Exception as e:
                    logger.error(f"Failed to add user to group: {str(e)}")
        
        except cognito_idp.exceptions.UsernameExistsException:
            return {
                'statusCode': 409,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'error': 'User already exists'
                })
            }
        except Exception as e:
            logger.error(f"Cognito user creation failed: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'error': 'Failed to create user account'
                })
            }
        
        # Store user profile in DynamoDB
        try:
            user_profiles_table = dynamodb.Table(USER_PROFILES_TABLE)
            user_profiles_table.put_item(
                Item={
                    'user_id': user_id,
                    'email': email,
                    'full_name': full_name,
                    'organization_id': organization_id,
                    'role': role,
                    'created_at': timestamp,
                    'updated_at': timestamp,
                    'status': 'active',
                    'preferences': {
                        'theme': 'light',
                        'language': 'en',
                        'notifications': True
                    },
                    'metadata': {
                        'last_login': None,
                        'login_count': 0,
                        'registration_ip': event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown'),
                        'user_agent': event.get('headers', {}).get('User-Agent', 'unknown')
                    }
                }
            )
            
            # Log the registration event
            log_system_event(
                user_id=user_id,
                event_type='user_registration',
                details=f'New user registered: {email} with role {role}',
                metadata={
                    'organization_id': organization_id,
                    'role': role,
                    'group_assigned': group_name if group_name else None
                }
            )
            
            logger.info(f"Successfully registered user: {email}")
            
            return {
                'statusCode': 201,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'message': 'User registered successfully',
                    'user_id': user_id,
                    'email': email,
                    'role': role,
                    'organization_id': organization_id
                })
            }
            
        except Exception as e:
            logger.error(f"DynamoDB operation failed: {str(e)}")
            
            # Try to cleanup Cognito user if DynamoDB failed
            try:
                cognito_idp.admin_delete_user(
                    UserPoolId=USER_POOL_ID,
                    Username=email
                )
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup Cognito user: {str(cleanup_error)}")
            
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'error': 'Failed to save user profile'
                })
            }
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'error': 'Internal server error'
            })
        }

def get_cognito_group(role, organization_id):
    """Determine appropriate Cognito group based on role"""
    role_lower = role.lower()
    
    if role_lower in ['developer', 'dev', 'development']:
        return 'Development'
    elif role_lower in ['tester', 'test', 'qa', 'testing']:
        return 'Testing'
    elif organization_id != 'individual':
        return 'OrgUsers'
    else:
        return 'BasicUsers'

def log_system_event(user_id, event_type, details, metadata=None):
    """Log system event to DynamoDB"""
    try:
        system_logs_table = dynamodb.Table(SYSTEM_LOGS_TABLE)
        log_id = f"{user_id}_{int(datetime.now(timezone.utc).timestamp())}"
        timestamp = datetime.now(timezone.utc).isoformat()
        
        system_logs_table.put_item(
            Item={
                'log_id': log_id,
                'timestamp': timestamp,
                'user_id': user_id,
                'event_type': event_type,
                'details': details,
                'metadata': metadata or {},
                'date': timestamp[:10],  # For daily aggregations
                'expires_at': int(datetime.now(timezone.utc).timestamp()) + (90 * 24 * 60 * 60)  # 90 days TTL
            }
        )
    except Exception as e:
        logger.error(f"Failed to log system event: {str(e)}")
EOF
    filename = "lambda_function.py"
  }
}

resource "aws_lambda_function" "user_registration" {
  filename      = data.archive_file.user_registration_zip.output_path
  function_name = "${local.name_prefix}-user-registration"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  timeout       = 30
  memory_size   = 256

  source_code_hash = data.archive_file.user_registration_zip.output_base64sha256

  layers = [aws_lambda_layer_version.shared_layer.arn]

  environment {
    variables = {
      USER_POOL_ID        = aws_cognito_user_pool.main.id
      USER_PROFILES_TABLE = aws_dynamodb_table.user_profiles.name
      SYSTEM_LOGS_TABLE   = aws_dynamodb_table.system_logs.name
      ENVIRONMENT         = var.environment
    }
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-user-registration"
    Purpose = "User registration and profile creation"
  })
}

# User Profile Management Lambda
data "archive_file" "user_profile_management_zip" {
  type        = "zip"
  output_path = "${path.module}/user_profile_management.zip"

  source {
    content  = <<EOF
import json
import boto3
from datetime import datetime, timezone
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
cognito_idp = boto3.client('cognito-idp')

# Environment variables
USER_POOL_ID = '${aws_cognito_user_pool.main.id}'
USER_PROFILES_TABLE = '${aws_dynamodb_table.user_profiles.name}'
SYSTEM_LOGS_TABLE = '${aws_dynamodb_table.system_logs.name}'

def lambda_handler(event, context):
    """
    Handle user profile management operations
    GET: Retrieve user profile
    PUT: Update user profile
    DELETE: Delete user account
    """
    try:
        http_method = event.get('httpMethod', 'GET')
        path_parameters = event.get('pathParameters', {})
        user_id = path_parameters.get('user_id')
        
        # Validate user_id
        if not user_id:
            return create_response(400, {'error': 'Missing user_id'})
        
        # Route based on HTTP method
        if http_method == 'GET':
            return get_user_profile(user_id, event)
        elif http_method == 'PUT':
            return update_user_profile(user_id, event)
        elif http_method == 'DELETE':
            return delete_user_account(user_id, event)
        else:
            return create_response(405, {'error': 'Method not allowed'})
    
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})

def get_user_profile(user_id, event):
    """Retrieve user profile from DynamoDB"""
    try:
        user_profiles_table = dynamodb.Table(USER_PROFILES_TABLE)
        response = user_profiles_table.get_item(Key={'user_id': user_id})
        
        if 'Item' not in response:
            return create_response(404, {'error': 'User not found'})
        
        user_profile = response['Item']
        
        # Remove sensitive information for non-admin users
        if not is_admin_request(event):
            user_profile.pop('metadata', None)
        
        return create_response(200, {
            'user_profile': user_profile
        })
    
    except Exception as e:
        logger.error(f"Failed to get user profile: {str(e)}")
        return create_response(500, {'error': 'Failed to retrieve user profile'})

def update_user_profile(user_id, event):
    """Update user profile in DynamoDB and Cognito"""
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        # Get current user profile
        user_profiles_table = dynamodb.Table(USER_PROFILES_TABLE)
        current_response = user_profiles_table.get_item(Key={'user_id': user_id})
        
        if 'Item' not in current_response:
            return create_response(404, {'error': 'User not found'})
        
        current_profile = current_response['Item']
        
        # Prepare updates
        update_expression = "SET updated_at = :updated_at"
        expression_values = {':updated_at': datetime.now(timezone.utc).isoformat()}
        
        # Update allowed fields
        updatable_fields = ['full_name', 'preferences', 'status']
        
        for field in updatable_fields:
            if field in body:
                update_expression += f", {field} = :{field}"
                expression_values[f':{field}'] = body[field]
        
        # Update role if admin request and role changed
        if is_admin_request(event) and 'role' in body and body['role'] != current_profile.get('role'):
            new_role = body['role']
            old_role = current_profile.get('role')
            
            # Update role in DynamoDB
            update_expression += ", role = :role"
            expression_values[':role'] = new_role
            
            # Update Cognito groups
            try:
                email = current_profile['email']
                old_group = get_cognito_group(old_role, current_profile.get('organization_id', 'individual'))
                new_group = get_cognito_group(new_role, current_profile.get('organization_id', 'individual'))
                
                # Remove from old group
                if old_group:
                    try:
                        cognito_idp.admin_remove_user_from_group(
                            UserPoolId=USER_POOL_ID,
                            Username=email,
                            GroupName=old_group
                        )
                    except Exception:
                        pass  # User might not be in the group
                
                # Add to new group
                if new_group:
                    cognito_idp.admin_add_user_to_group(
                        UserPoolId=USER_POOL_ID,
                        Username=email,
                        GroupName=new_group
                    )
                
                # Update Cognito user attributes
                cognito_idp.admin_update_user_attributes(
                    UserPoolId=USER_POOL_ID,
                    Username=email,
                    UserAttributes=[
                        {'Name': 'custom:role', 'Value': new_role}
                    ]
                )
                
                log_system_event(
                    user_id=user_id,
                    event_type='role_change',
                    details=f'User role changed from {old_role} to {new_role}',
                    metadata={'old_role': old_role, 'new_role': new_role}
                )
                
            except Exception as e:
                logger.error(f"Failed to update Cognito groups: {str(e)}")
                return create_response(500, {'error': 'Failed to update user permissions'})
        
        # Apply updates to DynamoDB
        user_profiles_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        # Get updated profile
        updated_response = user_profiles_table.get_item(Key={'user_id': user_id})
        updated_profile = updated_response['Item']
        
        # Remove sensitive information for non-admin users
        if not is_admin_request(event):
            updated_profile.pop('metadata', None)
        
        log_system_event(
            user_id=user_id,
            event_type='profile_update',
            details='User profile updated',
            metadata={'updated_fields': list(body.keys())}
        )
        
        return create_response(200, {
            'message': 'Profile updated successfully',
            'user_profile': updated_profile
        })
    
    except Exception as e:
        logger.error(f"Failed to update user profile: {str(e)}")
        return create_response(500, {'error': 'Failed to update profile'})

def delete_user_account(user_id, event):
    """Delete user account from both Cognito and DynamoDB"""
    try:
        # Only admins can delete accounts
        if not is_admin_request(event):
            return create_response(403, {'error': 'Insufficient permissions'})
        
        # Get current user profile
        user_profiles_table = dynamodb.Table(USER_PROFILES_TABLE)
        current_response = user_profiles_table.get_item(Key={'user_id': user_id})
        
        if 'Item' not in current_response:
            return create_response(404, {'error': 'User not found'})
        
        current_profile = current_response['Item']
        email = current_profile['email']
        
        # Delete from Cognito
        try:
            cognito_idp.admin_delete_user(
                UserPoolId=USER_POOL_ID,
                Username=email
            )
        except cognito_idp.exceptions.UserNotFoundException:
            logger.warning(f"User {email} not found in Cognito")
        except Exception as e:
            logger.error(f"Failed to delete user from Cognito: {str(e)}")
            return create_response(500, {'error': 'Failed to delete user from authentication system'})
        
        # Mark as deleted in DynamoDB (soft delete)
        user_profiles_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression="SET #status = :status, updated_at = :updated_at, deleted_at = :deleted_at",
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'deleted',
                ':updated_at': datetime.now(timezone.utc).isoformat(),
                ':deleted_at': datetime.now(timezone.utc).isoformat()
            }
        )
        
        log_system_event(
            user_id=user_id,
            event_type='account_deletion',
            details=f'User account deleted: {email}',
            metadata={'email': email, 'deleted_by': 'admin'}
        )
        
        return create_response(200, {
            'message': 'User account deleted successfully'
        })
    
    except Exception as e:
        logger.error(f"Failed to delete user account: {str(e)}")
        return create_response(500, {'error': 'Failed to delete account'})

def get_cognito_group(role, organization_id):
    """Determine appropriate Cognito group based on role"""
    role_lower = role.lower()
    
    if role_lower in ['developer', 'dev', 'development']:
        return 'Development'
    elif role_lower in ['tester', 'test', 'qa', 'testing']:
        return 'Testing'
    elif organization_id != 'individual':
        return 'OrgUsers'
    else:
        return 'BasicUsers'

def is_admin_request(event):
    """Check if request is from an admin user"""
    try:
        # Check if request contains admin JWT claims
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        claims = authorizer.get('claims', {})
        
        # Check for admin role in cognito:groups
        groups = claims.get('cognito:groups', '')
        if isinstance(groups, str):
            groups = [groups] if groups else []
        
        return 'Development' in groups or 'Testing' in groups
    except Exception:
        return False

def log_system_event(user_id, event_type, details, metadata=None):
    """Log system event to DynamoDB"""
    try:
        system_logs_table = dynamodb.Table(SYSTEM_LOGS_TABLE)
        log_id = f"{user_id}_{int(datetime.now(timezone.utc).timestamp())}"
        timestamp = datetime.now(timezone.utc).isoformat()
        
        system_logs_table.put_item(
            Item={
                'log_id': log_id,
                'timestamp': timestamp,
                'user_id': user_id,
                'event_type': event_type,
                'details': details,
                'metadata': metadata or {},
                'date': timestamp[:10],
                'expires_at': int(datetime.now(timezone.utc).timestamp()) + (90 * 24 * 60 * 60)
            }
        )
    except Exception as e:
        logger.error(f"Failed to log system event: {str(e)}")

def create_response(status_code, body):
    """Create standardized API response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS'
        },
        'body': json.dumps(body)
    }
EOF
    filename = "lambda_function.py"
  }
}

resource "aws_lambda_function" "user_profile_management" {
  filename      = data.archive_file.user_profile_management_zip.output_path
  function_name = "${local.name_prefix}-user-profile-management"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  timeout       = 30
  memory_size   = 256

  source_code_hash = data.archive_file.user_profile_management_zip.output_base64sha256

  layers = [aws_lambda_layer_version.shared_layer.arn]

  environment {
    variables = {
      USER_POOL_ID        = aws_cognito_user_pool.main.id
      USER_PROFILES_TABLE = aws_dynamodb_table.user_profiles.name
      SYSTEM_LOGS_TABLE   = aws_dynamodb_table.system_logs.name
      ENVIRONMENT         = var.environment
    }
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-user-profile-management"
    Purpose = "User profile CRUD operations"
  })
}

# Authentication Lambda (Post-Authentication Trigger)
data "archive_file" "auth_post_authentication_zip" {
  type        = "zip"
  output_path = "${path.module}/auth_post_authentication.zip"

  source {
    content  = <<EOF
import json
import boto3
from datetime import datetime, timezone
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')

# Environment variables
USER_PROFILES_TABLE = '${aws_dynamodb_table.user_profiles.name}'
USER_SESSIONS_TABLE = '${aws_dynamodb_table.user_sessions.name}'
SYSTEM_LOGS_TABLE = '${aws_dynamodb_table.system_logs.name}'

def lambda_handler(event, context):
    """
    Post-authentication trigger for Cognito
    Updates user profile with login information
    Creates session record
    """
    try:
        # Extract user information from Cognito event
        user_attributes = event.get('request', {}).get('userAttributes', {})
        username = event.get('userName', '')
        
        user_id = user_attributes.get('custom:user_id', '')
        email = user_attributes.get('email', username)
        
        if not user_id:
            logger.error("No user_id found in user attributes")
            return event  # Return event unchanged for Cognito
        
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Update user profile with last login
        user_profiles_table = dynamodb.Table(USER_PROFILES_TABLE)
        try:
            # Get current login count
            current_response = user_profiles_table.get_item(Key={'user_id': user_id})
            current_login_count = 0
            
            if 'Item' in current_response:
                metadata = current_response['Item'].get('metadata', {})
                current_login_count = metadata.get('login_count', 0)
            
            # Update profile
            user_profiles_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression="""
                    SET metadata.last_login = :timestamp,
                        metadata.login_count = :login_count,
                        updated_at = :timestamp
                """,
                ExpressionAttributeValues={
                    ':timestamp': timestamp,
                    ':login_count': current_login_count + 1
                }
            )
            
            logger.info(f"Updated login info for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to update user profile: {str(e)}")
        
        # Create session record
        try:
            session_id = f"{user_id}_{int(datetime.now(timezone.utc).timestamp())}"
            session_expires = int(datetime.now(timezone.utc).timestamp()) + (24 * 60 * 60)  # 24 hours
            
            user_sessions_table = dynamodb.Table(USER_SESSIONS_TABLE)
            user_sessions_table.put_item(
                Item={
                    'session_id': session_id,
                    'user_id': user_id,
                    'created_at': timestamp,
                    'expires_at': session_expires,
                    'status': 'active',
                    'client_info': {
                        'user_agent': event.get('request', {}).get('userAgent', 'unknown'),
                        'client_id': event.get('request', {}).get('clientId', 'unknown')
                    }
                }
            )
            
            logger.info(f"Created session {session_id} for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to create session record: {str(e)}")
        
        # Log authentication event
        try:
            log_system_event(
                user_id=user_id,
                event_type='user_login',
                details=f'User {email} logged in successfully',
                metadata={
                    'email': email,
                    'session_id': session_id,
                    'login_method': 'cognito'
                }
            )
        except Exception as e:
            logger.error(f"Failed to log authentication event: {str(e)}")
        
        # Return the event unchanged (required for Cognito triggers)
        return event
    
    except Exception as e:
        logger.error(f"Post-authentication trigger failed: {str(e)}")
        # Still return event to not break authentication flow
        return event

def log_system_event(user_id, event_type, details, metadata=None):
    """Log system event to DynamoDB"""
    try:
        system_logs_table = dynamodb.Table(SYSTEM_LOGS_TABLE)
        log_id = f"{user_id}_{int(datetime.now(timezone.utc).timestamp())}"
        timestamp = datetime.now(timezone.utc).isoformat()
        
        system_logs_table.put_item(
            Item={
                'log_id': log_id,
                'timestamp': timestamp,
                'user_id': user_id,
                'event_type': event_type,
                'details': details,
                'metadata': metadata or {},
                'date': timestamp[:10],
                'expires_at': int(datetime.now(timezone.utc).timestamp()) + (90 * 24 * 60 * 60)
            }
        )
    except Exception as e:
        logger.error(f"Failed to log system event: {str(e)}")
EOF
    filename = "lambda_function.py"
  }
}

resource "aws_lambda_function" "auth_post_authentication" {
  filename      = data.archive_file.auth_post_authentication_zip.output_path
  function_name = "${local.name_prefix}-auth-post-authentication"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  timeout       = 10
  memory_size   = 128

  source_code_hash = data.archive_file.auth_post_authentication_zip.output_base64sha256

  layers = [aws_lambda_layer_version.shared_layer.arn]

  environment {
    variables = {
      USER_PROFILES_TABLE = aws_dynamodb_table.user_profiles.name
      USER_SESSIONS_TABLE = aws_dynamodb_table.user_sessions.name
      SYSTEM_LOGS_TABLE   = aws_dynamodb_table.system_logs.name
      ENVIRONMENT         = var.environment
    }
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-auth-post-authentication"
    Purpose = "Post-authentication processing"
  })
}

# Grant Cognito permission to invoke the post-authentication Lambda
resource "aws_lambda_permission" "cognito_invoke_post_auth" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_post_authentication.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

# Note: Lambda triggers will be added to the existing user pool via AWS CLI
# as Terraform cannot modify existing user pool schemas

# Outputs
output "lambda_user_registration_arn" {
  description = "ARN of the user registration Lambda function"
  value       = aws_lambda_function.user_registration.arn
}

output "lambda_user_registration_invoke_arn" {
  description = "Invoke ARN of the user registration Lambda function"
  value       = aws_lambda_function.user_registration.invoke_arn
}

output "lambda_user_profile_management_arn" {
  description = "ARN of the user profile management Lambda function"
  value       = aws_lambda_function.user_profile_management.arn
}

output "lambda_user_profile_management_invoke_arn" {
  description = "Invoke ARN of the user profile management Lambda function"
  value       = aws_lambda_function.user_profile_management.invoke_arn
}

output "lambda_auth_post_authentication_arn" {
  description = "ARN of the post-authentication Lambda function"
  value       = aws_lambda_function.auth_post_authentication.arn
}
